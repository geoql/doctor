import { parseSync } from 'oxc-parser';
import type {
  AstNode,
  ReportDescriptor,
  Rule,
  RuleContext,
} from '../src/rule-types.js';

export interface RunRuleOptions {
  filename?: string;
  /** Capability tokens visible to the rule (e.g. 'auto-imports:vue'). */
  capabilities?: string[];
  settings?: Record<string, unknown>;
}

export interface CapturedReport {
  message: string;
  type: string;
  line?: number;
  column?: number;
}

const SKIP_KEYS = new Set(['type', 'loc', 'start', 'end', 'range', 'parent']);

/**
 * Depth-first walk of an ESTree program, invoking a visitor keyed by node
 * `type` on enter. Mirrors how oxlint dispatches JS-plugin rule visitors.
 */
function walk(node: AstNode, visit: (n: AstNode) => void): void {
  visit(node);
  for (const key of Object.keys(node)) {
    if (SKIP_KEYS.has(key)) continue;
    const value = (node as Record<string, unknown>)[key];
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof child === 'object' && 'type' in child) {
          walk(child as AstNode, visit);
        }
      }
    } else if (value && typeof value === 'object' && 'type' in value) {
      walk(value as AstNode, visit);
    }
  }
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
      reports.push({
        message: descriptor.message,
        type: descriptor.node.type,
        line: descriptor.node.loc?.start.line,
        column: descriptor.node.loc?.start.column,
      });
    },
    getFilename: () => filename,
    settings: options.settings,
    capabilities,
  };

  const visitors = rule.create(context);
  walk(parsed.program as unknown as AstNode, (node) => {
    const visitor = visitors[node.type];
    if (visitor) visitor(node);
  });

  return reports;
}
