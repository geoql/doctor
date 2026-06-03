import { parseSync } from 'oxc-parser';
import type {
  AstNode,
  Fixer,
  ReportDescriptor,
  Rule,
  RuleContext,
} from '../src/rule-types.js';

export interface RunRuleOptions {
  filename?: string;
  /** Capability tokens visible to the rule (e.g. 'auto-imports:vue'). */
  capabilities?: string[];
  settings?: Record<string, unknown>;
  applyFix?: boolean;
}

export interface CapturedReport {
  message: string;
  type: string;
  line?: number;
  column?: number;
  fixed?: string;
}

const captureFixer: Fixer = {
  replaceText: (node, text) => ({ range: [0, 0], text, node }),
};

const WALK_SKIP = new Set(['type', 'loc', 'start', 'end', 'range', 'parent']);

function attachParents(node: AstNode, parent: AstNode | null): void {
  if (parent) (node as Record<string, unknown>)['parent'] = parent;
  for (const key of Object.keys(node)) {
    if (WALK_SKIP.has(key)) continue;
    const value = (node as Record<string, unknown>)[key];
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof child === 'object' && 'type' in child) {
          attachParents(child as AstNode, node);
        }
      }
    } else if (value && typeof value === 'object' && 'type' in value) {
      attachParents(value as AstNode, node);
    }
  }
}

/**
 * Depth-first walk of an ESTree program, dispatching enter and `:exit`
 * visitors. Mirrors how oxlint dispatches JS-plugin rule visitors.
 */
function walk(
  node: AstNode,
  visitors: Record<string, (n: AstNode) => void>,
): void {
  const enter = visitors[node.type];
  if (enter) enter(node);
  for (const key of Object.keys(node)) {
    if (WALK_SKIP.has(key)) continue;
    const value = (node as Record<string, unknown>)[key];
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof child === 'object' && 'type' in child) {
          walk(child as AstNode, visitors);
        }
      }
    } else if (value && typeof value === 'object' && 'type' in value) {
      walk(value as AstNode, visitors);
    }
  }
  const exit = visitors[`${node.type}:exit`];
  if (exit) exit(node);
}

/**
 * Parse `code` as a TS module, run `rule` over the AST, and return every
 * diagnostic the rule reported. Used by rule unit tests.
 */
export function runRule(
  rule: Rule,
  code: string,
  options: RunRuleOptions = {},
): CapturedReport[] {
  const filename = options.filename ?? 'fixture.ts';
  const parsed = parseSync(filename, code, {
    sourceType: 'module',
    lang: 'ts',
  });
  const reports: CapturedReport[] = [];

  const capabilities = new Set(options.capabilities ?? []);
  const context: RuleContext = {
    report: (descriptor: ReportDescriptor) => {
      const captured: CapturedReport = {
        message: descriptor.message,
        type: descriptor.node.type,
        line: descriptor.node.loc?.start.line,
        column: descriptor.node.loc?.start.column,
      };
      if (options.applyFix && descriptor.fix) {
        captured.fixed = descriptor.fix(captureFixer).text;
      }
      reports.push(captured);
    },
    getFilename: () => filename,
    settings: options.settings,
    capabilities,
  };

  const program = parsed.program as unknown as AstNode;
  attachParents(program, null);
  const visitors = rule.create(context);
  walk(program, visitors);

  return reports;
}
