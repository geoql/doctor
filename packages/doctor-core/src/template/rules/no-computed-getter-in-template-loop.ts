import type {
  ElementNode,
  RootNode,
  TemplateChildNode,
} from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

const NODE_ELEMENT = 1;
const NODE_INTERPOLATION = 5;
const NODE_DIRECTIVE = 7;

interface ExprNode {
  type?: string;
  computed?: boolean;
  name?: string;
  object?: ExprNode;
  property?: ExprNode;
}

interface Loc {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

interface BindDirective {
  name?: string;
  exp?: { ast?: unknown } | null;
  loc: Loc;
}

interface InterpolationNode {
  content: { ast?: unknown };
  loc: Loc;
}

interface ForDirective {
  name?: string;
  forParseResult?: {
    value?: { content?: string; ast?: unknown } | null;
    key?: { content?: string } | null;
    index?: { content?: string } | null;
  };
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

function collectIdentifierNames(value: unknown, into: Set<string>): void {
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) collectIdentifierNames(item, into);
    return;
  }
  const node = value as ExprNode;
  if (node.type === 'Identifier' && node.name) into.add(node.name);
  for (const child of Object.values(node)) collectIdentifierNames(child, into);
}

// The v-for alias (`opt` in `v-for="opt in options"`) is a plain data item, so
// `opt.value` is a property read, not a ref deref — aliases must not be flagged.
function collectForAliases(el: ElementNode, into: Set<string>): void {
  for (const prop of el.props) {
    if (prop.type !== NODE_DIRECTIVE) continue;
    const dir = prop as ForDirective;
    if (dir.name !== 'for' || !dir.forParseResult) continue;
    for (const part of [
      dir.forParseResult.value,
      dir.forParseResult.key,
      dir.forParseResult.index,
    ]) {
      if (!part?.content) continue;
      if (IDENTIFIER.test(part.content)) {
        into.add(part.content);
      } else {
        collectIdentifierNames(part.ast, into);
      }
    }
  }
}

function isValueDeref(node: ExprNode, aliases: ReadonlySet<string>): boolean {
  if (node.type !== 'MemberExpression' || node.computed === true) return false;
  const { object, property } = node as {
    object: ExprNode;
    property: ExprNode;
  };
  return (
    object.type === 'Identifier' &&
    property.name === 'value' &&
    !aliases.has(String(object.name))
  );
}

function containsValueDeref(
  value: unknown,
  aliases: ReadonlySet<string>,
): boolean {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) {
    return value.some((item) => containsValueDeref(item, aliases));
  }
  const node = value as ExprNode;
  return (
    isValueDeref(node, aliases) ||
    Object.values(node).some((child) => containsValueDeref(child, aliases))
  );
}

function pushDiagnostic(
  el: ElementNode,
  loc: Loc,
  ctx: TemplateRuleContext,
  diagnostics: Diagnostic[],
): void {
  diagnostics.push({
    file: ctx.file,
    line: loc.start.line,
    column: loc.start.column,
    endLine: loc.end.line,
    endColumn: loc.end.column,
    ruleId: 'vue-doctor/template/no-computed-getter-in-template-loop',
    severity: 'warn',
    message: `<${el.tag}> reads a ref or computed via .value inside a v-for subtree. The getter re-runs on every item and every render, which is easy to hoist out of the loop.`,
    source: 'template',
    recommendation:
      'Read .value once into a computed property or a local binding outside the loop so the getter runs a single time per render.',
  });
}

function checkElement(
  el: ElementNode,
  inVForSubtree: boolean,
  aliases: ReadonlySet<string>,
  ctx: TemplateRuleContext,
  diagnostics: Diagnostic[],
): void {
  const isVFor = el.props.some(
    (p) => p.type === NODE_DIRECTIVE && (p as { name?: string }).name === 'for',
  );

  const effectiveInVFor = inVForSubtree || isVFor;
  let effectiveAliases = aliases;
  if (isVFor) {
    const next = new Set(aliases);
    collectForAliases(el, next);
    effectiveAliases = next;
  }

  if (effectiveInVFor) {
    for (const prop of el.props) {
      if (prop.type !== NODE_DIRECTIVE) continue;
      const dir = prop as BindDirective;
      if (dir.name !== 'bind') continue;
      if (containsValueDeref(dir.exp?.ast, effectiveAliases)) {
        pushDiagnostic(el, dir.loc, ctx, diagnostics);
      }
    }

    for (const child of el.children) {
      if (child.type === NODE_INTERPOLATION) {
        const interp = child as unknown as InterpolationNode;
        if (containsValueDeref(interp.content.ast, effectiveAliases)) {
          pushDiagnostic(el, interp.loc, ctx, diagnostics);
        }
      }
    }
  }

  for (const child of el.children) {
    if (child.type === NODE_ELEMENT) {
      checkElement(
        child as ElementNode,
        effectiveInVFor,
        effectiveAliases,
        ctx,
        diagnostics,
      );
    }
  }
}

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];

  function walk(node: TemplateChildNode, inVForSubtree: boolean): void {
    if (node.type === NODE_ELEMENT) {
      checkElement(
        node as ElementNode,
        inVForSubtree,
        new Set<string>(),
        ctx,
        diagnostics,
      );
    } else if (node.type === 0) {
      const root = node as RootNode;
      for (const child of root.children) {
        walk(child, inVForSubtree);
      }
    }
  }

  walk(ctx.template as unknown as TemplateChildNode, false);
  return { diagnostics };
}
