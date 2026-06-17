import type {
  AttributeNode,
  DirectiveNode,
  ElementNode,
} from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import { findBindAttr, findStaticAttr } from '../directive-helpers.js';
import { walkElements } from '../walk.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

function unquote(raw: string): string {
  const trimmed = raw.trim();
  const first = trimmed.charAt(0);
  if ((first === '"' || first === "'") && trimmed.endsWith(first)) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function attrValue(
  el: ElementNode,
  name: string,
):
  | { value: string; loc: AttributeNode['loc'] | DirectiveNode['loc'] }
  | undefined {
  const staticAttr = findStaticAttr(el, name);
  if (staticAttr) {
    return { value: staticAttr.value?.content ?? '', loc: staticAttr.loc };
  }
  const bound = findBindAttr(el, name);
  if (bound?.exp && 'content' in bound.exp) {
    return { value: unquote(bound.exp.content as string), loc: bound.loc };
  }
  return undefined;
}

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];
  walkElements(ctx.template, (el: ElementNode) => {
    if (el.tag !== 'a') return;
    const target = attrValue(el, 'target');
    if (!target || target.value !== '_blank') return;
    const rel = attrValue(el, 'rel');
    if (rel && rel.value.includes('noopener')) return;
    diagnostics.push({
      file: ctx.file,
      line: target.loc.start.line,
      column: target.loc.start.column,
      endLine: target.loc.end.line,
      endColumn: target.loc.end.column,
      ruleId: 'vue-doctor/security/no-target-blank-without-rel',
      severity: 'warn',
      message: `<a target="_blank"> without rel="noopener noreferrer" exposes the opener window to reverse-tabnabbing.`,
      source: 'template',
      recommendation:
        'Add rel="noopener noreferrer" to anchors that open in a new tab.',
    });
  });
  return { diagnostics };
}
