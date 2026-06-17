import type {
  AttributeNode,
  DirectiveNode,
  ElementNode,
} from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import { walkElements } from '../walk.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

const NODE_ATTRIBUTE = 6;

const URI_SINKS = new Set([
  'href',
  'src',
  'srcset',
  'action',
  'xlink:href',
  'formaction',
  'poster',
  'data',
]);

const DANGEROUS_SCHEME = /^\s*(?:javascript:|vbscript:|data:text\/html)/i;

function unquote(raw: string): string {
  const trimmed = raw.trim();
  const first = trimmed.charAt(0);
  if (
    (first === '"' || first === "'" || first === '`') &&
    trimmed.endsWith(first)
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

interface UriProp {
  name: string;
  value: string;
  loc: AttributeNode['loc'] | DirectiveNode['loc'];
}

function resolveUriProp(
  prop: AttributeNode | DirectiveNode,
): UriProp | undefined {
  if (prop.type === NODE_ATTRIBUTE) {
    const attr = prop as AttributeNode;
    if (attr.value === undefined) return undefined;
    return { name: attr.name, value: attr.value.content, loc: attr.loc };
  }
  const dir = prop as DirectiveNode;
  if (dir.name !== 'bind') return undefined;
  if (!dir.arg || !('content' in dir.arg)) return undefined;
  if (!dir.exp || !('content' in dir.exp)) return undefined;
  return {
    name: dir.arg.content as string,
    value: unquote(dir.exp.content as string),
    loc: dir.loc,
  };
}

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];
  walkElements(ctx.template, (el: ElementNode) => {
    for (const prop of el.props) {
      const resolved = resolveUriProp(prop as AttributeNode | DirectiveNode);
      if (!resolved) continue;
      if (!URI_SINKS.has(resolved.name)) continue;
      if (!DANGEROUS_SCHEME.test(resolved.value)) continue;

      diagnostics.push({
        file: ctx.file,
        line: resolved.loc.start.line,
        column: resolved.loc.start.column,
        endLine: resolved.loc.end.line,
        endColumn: resolved.loc.end.column,
        ruleId: 'vue-doctor/security/no-javascript-uri',
        severity: 'error',
        message: `<${el.tag}> binds ${resolved.name} to a dangerous URI scheme (javascript:/vbscript:/data:text/html), which executes arbitrary code.`,
        source: 'template',
        recommendation:
          'Use a safe http(s) or relative URL; never put a javascript:, vbscript:, or data:text/html value in a URL attribute.',
      });
    }
  });
  return { diagnostics };
}
