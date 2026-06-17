import type { DirectiveNode, ElementNode } from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import { findDirective } from '../directive-helpers.js';
import { walkElements } from '../walk.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];
  walkElements(ctx.template, (el: ElementNode) => {
    const vHtml: DirectiveNode | undefined = findDirective(el, 'html');
    if (!vHtml) return;
    diagnostics.push({
      file: ctx.file,
      line: vHtml.loc.start.line,
      column: vHtml.loc.start.column,
      endLine: vHtml.loc.end.line,
      endColumn: vHtml.loc.end.column,
      ruleId: 'vue-doctor/security/no-v-html',
      severity: 'error',
      message: `<${el.tag}> uses v-html, which renders raw HTML and bypasses Vue's escaping — the primary XSS sink in Vue apps.`,
      source: 'template',
      recommendation:
        'Render text with {{ }} interpolation, or sanitize the HTML with DOMPurify in a computed before binding it.',
    });
  });
  return { diagnostics };
}
