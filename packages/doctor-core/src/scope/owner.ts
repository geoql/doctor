import { parse as parseSfc } from '@vue/compiler-sfc';
import { parseSync, Visitor } from 'oxc-parser';
import type { Diagnostic } from '../types.js';
import type { DiffScope } from './diff-scope.js';
import type { LineRange } from './match.js';

/** A template AST node as far as ownership needs it. */
interface TemplateNode {
  readonly type: number;
  readonly loc: {
    readonly start: { readonly line: number; readonly column: number };
    readonly end: { readonly line: number; readonly column: number };
  };
  /** Always present on the root and on element nodes. */
  readonly children: readonly TemplateNode[];
}

const ELEMENT_NODE = 1;

interface Span {
  readonly start: number;
  readonly end: number;
}

function lineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) === 10) starts.push(i + 1);
  }
  return starts;
}

function offsetOf(
  starts: readonly number[],
  line: number,
  column: number,
): number {
  return starts[line - 1]! + column - 1;
}

function lineOf(starts: readonly number[], offset: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid]! <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

/**
 * The lines an owner covers MINUS the lines of nested owners of the same
 * kind (an edit inside a child element or nested function belongs to that
 * child), always keeping the diagnostic's own line.
 */
function ownedLines(
  owner: LineRange,
  children: readonly LineRange[],
  keep: number,
): LineRange[] {
  const out: LineRange[] = [];
  let cursor = owner[0];
  const sorted = [...children].sort((a, b) => a[0] - b[0]);
  for (const [start, end] of sorted) {
    if (start > cursor) out.push([cursor, start - 1]);
    cursor = Math.max(cursor, end + 1);
  }
  if (cursor <= owner[1]) out.push([cursor, owner[1]]);
  if (!out.some(([s, e]) => s <= keep && keep <= e)) out.push([keep, keep]);
  return out;
}

function templateOwner(source: string, d: Diagnostic): LineRange[] | null {
  const { descriptor } = parseSfc(source);
  const root = descriptor.template?.ast as TemplateNode | undefined;
  if (!root) return null;
  const contains = (n: TemplateNode): boolean => {
    const { start, end } = n.loc;
    const afterStart =
      d.line > start.line ||
      (d.line === start.line && d.column >= start.column);
    const beforeEnd =
      d.line < end.line || (d.line === end.line && d.column <= end.column);
    return afterStart && beforeEnd;
  };
  let owner: TemplateNode | undefined;
  let level: readonly TemplateNode[] = root.children;
  for (;;) {
    const next = level.find((n) => n.type === ELEMENT_NODE && contains(n));
    if (!next) break;
    owner = next;
    level = next.children;
  }
  if (!owner) return null;
  const children = owner.children
    .filter((n) => n.type === ELEMENT_NODE)
    .map((n) => [n.loc.start.line, n.loc.end.line] as const);
  return ownedLines(
    [owner.loc.start.line, owner.loc.end.line],
    children,
    d.line,
  );
}

interface ScriptBlock {
  readonly content: string;
  /** 1-based file line of the block's first content line. */
  readonly startLine: number;
  /** Column offset of the first content line (0 unless inline). */
  readonly startColumn: number;
  readonly lang: string;
}

function scriptBlocks(filePath: string, source: string): ScriptBlock[] {
  if (!filePath.endsWith('.vue')) {
    const lang = filePath.slice(filePath.lastIndexOf('.') + 1);
    return [{ content: source, startLine: 1, startColumn: 0, lang }];
  }
  const { descriptor } = parseSfc(source);
  return [descriptor.script, descriptor.scriptSetup].flatMap((block) =>
    block
      ? [
          {
            content: block.content,
            startLine: block.loc.start.line,
            startColumn: block.loc.start.column - 1,
            lang: block.lang ?? 'js',
          },
        ]
      : [],
  );
}

function collectSpans(
  block: ScriptBlock,
  kind: 'function' | 'component',
): Span[] {
  const { program, errors } = parseSync(`owner.${block.lang}`, block.content);
  if (errors.length > 0) return [];
  const spans: Span[] = [];
  const add = (node: Span): void => {
    spans.push({ start: node.start, end: node.end });
  };
  const visitor =
    kind === 'function'
      ? new Visitor({
          FunctionDeclaration: add,
          FunctionExpression: add,
          ArrowFunctionExpression: add,
        })
      : new Visitor({
          ExportDefaultDeclaration: add,
          CallExpression: (node) => {
            if (
              node.callee.type === 'Identifier' &&
              node.callee.name === 'defineComponent'
            ) {
              add(node);
            }
          },
        });
  visitor.visit(program);
  return spans;
}

function scriptOwner(
  filePath: string,
  source: string,
  d: Diagnostic,
  kind: 'function' | 'component',
): LineRange[] | null {
  for (const block of scriptBlocks(filePath, source)) {
    const starts = lineStarts(block.content);
    const localLine = d.line - block.startLine + 1;
    if (localLine < 1 || localLine > starts.length) continue;
    const column = localLine === 1 ? d.column - block.startColumn : d.column;
    const offset = offsetOf(starts, localLine, column);
    const spans = collectSpans(block, kind);
    const enclosing = spans
      .filter((s) => s.start <= offset && offset < s.end)
      .sort((a, b) => b.start - a.start);
    const owner = enclosing[0];
    if (!owner) return null;
    const toFile = (s: Span): LineRange => [
      lineOf(starts, s.start) + block.startLine - 1,
      lineOf(starts, Math.max(s.start, s.end - 1)) + block.startLine - 1,
    ];
    const nested =
      kind === 'function'
        ? spans
            .filter(
              (s) =>
                s !== owner && s.start >= owner.start && s.end <= owner.end,
            )
            .map(toFile)
        : [];
    return ownedLines(toFile(owner), nested, d.line);
  }
  return null;
}

/**
 * Resolve the line ranges a diagnostic's owner covers, or `null` when the
 * owner cannot be found (the matcher then keeps plain line matching).
 */
export function resolveOwnerRanges(
  filePath: string,
  source: string,
  d: Diagnostic,
  scope: Exclude<DiffScope, 'line'>,
): LineRange[] | null {
  const lineCount = Math.max(1, source.replace(/\n$/, '').split('\n').length);
  if (scope === 'file') return [[1, lineCount]];
  if (scope === 'template-element') {
    return filePath.endsWith('.vue') ? templateOwner(source, d) : null;
  }
  if (scope === 'component' && filePath.endsWith('.vue')) {
    return [[1, lineCount]];
  }
  return scriptOwner(filePath, source, d, scope);
}
