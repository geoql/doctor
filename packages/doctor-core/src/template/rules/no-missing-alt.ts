import type { ElementNode } from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import { findBindAttr, findStaticAttr } from '../directive-helpers.js';
import { walkElements } from '../walk.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

const IMAGE_TAGS = new Set(['img', 'NuxtImg', 'nuxt-img']);

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];
  walkElements(ctx.template, (el: ElementNode) => {
    if (!IMAGE_TAGS.has(el.tag)) return;
    const hasAlt = findStaticAttr(el, 'alt') ?? findBindAttr(el, 'alt');
    if (hasAlt) return;
    diagnostics.push({
      file: ctx.file,
      line: el.loc.start.line,
      column: el.loc.start.column,
      endLine: el.loc.end.line,
      endColumn: el.loc.end.column,
      ruleId: 'vue-doctor/design/no-missing-alt',
      severity: 'warn',
      message: `<${el.tag}> has no alt attribute. Screen readers and SEO depend on descriptive alt text.`,
      source: 'template',
      recommendation:
        'Add an alt attribute describing the image, or alt="" for purely decorative images.',
    });
  });
  return { diagnostics };
}
