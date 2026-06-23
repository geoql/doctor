import type { ElementNode } from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import { findDirective } from '../directive-helpers.js';
import { walkElements } from '../walk.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];

  walkElements(ctx.template, (el: ElementNode) => {
    const vMemo = findDirective(el, 'memo');
    if (!vMemo) return;
    diagnostics.push({
      file: ctx.file,
      line: vMemo.loc.start.line,
      column: vMemo.loc.start.column,
      endLine: vMemo.loc.end.line,
      endColumn: vMemo.loc.end.column,
      ruleId: 'vue-doctor/template/no-v-memo-in-vapor',
      severity: 'warn',
      message: `<${el.tag}> uses v-memo in a Vapor-mode component. Vapor compiles to fine-grained DOM updates with no virtual-DOM diff, so v-memo is a no-op here and only adds noise.`,
      source: 'template',
      recommendation:
        'Remove v-memo from this Vapor component; fine-grained reactivity already avoids re-rendering unchanged nodes.',
    });
  });

  return { diagnostics };
}
