import type { ElementNode } from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import { findStaticStyle } from '../class-attr-helpers.js';
import { walkElements } from '../walk.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

const HARDCODED_VALUE =
  /\d+px\b|#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];
  walkElements(ctx.template, (el: ElementNode) => {
    const style = findStaticStyle(el);
    if (!style?.value) return;
    if (!HARDCODED_VALUE.test(style.value.content)) return;
    diagnostics.push({
      file: ctx.file,
      line: style.loc.start.line,
      column: style.loc.start.column,
      endLine: style.loc.end.line,
      endColumn: style.loc.end.column,
      ruleId: 'vue-doctor/design/no-hardcoded-inline-style',
      severity: 'warn',
      message: `<${el.tag}> uses an inline style with hardcoded px or hex values. Inline styles bypass tokens, hurt caching, and create drift.`,
      source: 'template',
      recommendation:
        'Move the styling to token-based utility classes (e.g. w-60 text-neutral-700) instead of an inline style.',
    });
  });
  return { diagnostics };
}
