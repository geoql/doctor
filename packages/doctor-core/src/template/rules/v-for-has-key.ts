import type { ElementNode } from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import {
  findBindAttr,
  findDirective,
  findStaticAttr,
} from '../directive-helpers.js';
import { walkElements } from '../walk.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];
  walkElements(ctx.template, (el: ElementNode) => {
    const vFor = findDirective(el, 'for');
    if (!vFor) return;
    const hasKey = findBindAttr(el, 'key') ?? findStaticAttr(el, 'key');
    if (hasKey) return;
    diagnostics.push({
      file: ctx.file,
      line: el.loc.start.line,
      column: el.loc.start.column,
      endLine: el.loc.end.line,
      endColumn: el.loc.end.column,
      ruleId: 'vue-doctor/template/v-for-has-key',
      severity: 'error',
      message: `<${el.tag}> uses v-for without :key. Vue cannot efficiently diff this list across renders.`,
      source: 'template',
      recommendation:
        'Add :key with a stable, unique identifier from the iterated item.',
    });
  });
  return { diagnostics };
}
