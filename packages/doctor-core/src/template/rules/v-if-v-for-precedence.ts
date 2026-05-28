import type { ElementNode } from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import { findDirective } from '../directive-helpers.js';
import { walkElements } from '../walk.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];
  walkElements(ctx.template, (el: ElementNode) => {
    const vIf = findDirective(el, 'if');
    const vFor = findDirective(el, 'for');
    if (!vIf || !vFor) return;
    diagnostics.push({
      file: ctx.file,
      line: el.loc.start.line,
      column: el.loc.start.column,
      endLine: el.loc.end.line,
      endColumn: el.loc.end.column,
      ruleId: 'vue-doctor/template/v-if-v-for-precedence',
      severity: 'error',
      message: `<${el.tag}> uses v-if and v-for on the same element. In Vue 3, v-if binds tighter than v-for, so the condition cannot reference loop variables.`,
      source: 'template',
      recommendation:
        'Move the v-if to a <template v-for> wrapper or to a parent element, or filter the iterated source in a computed.',
    });
  });
  return { diagnostics };
}
