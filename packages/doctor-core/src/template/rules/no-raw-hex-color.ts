import type { ElementNode } from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import { collectClassSources, findStaticStyle } from '../class-attr-helpers.js';
import { walkElements } from '../walk.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

const HEX_COLOR = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;

const RULE_ID = 'vue-doctor/design/no-raw-hex-color';
const MESSAGE =
  'Raw hex color bypasses the token system and breaks theming. Use a semantic color token instead.';
const RECOMMENDATION =
  'Replace the hex color with a design token (e.g. bg-danger / text-success) defined in your @theme.';

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];
  walkElements(ctx.template, (el: ElementNode) => {
    for (const source of collectClassSources(el)) {
      if (!HEX_COLOR.test(source.text)) continue;
      diagnostics.push({
        file: ctx.file,
        line: source.loc.start.line,
        column: source.loc.start.column,
        endLine: source.loc.end.line,
        endColumn: source.loc.end.column,
        ruleId: RULE_ID,
        severity: 'warn',
        message: `<${el.tag}> embeds a raw hex color in a class. ${MESSAGE}`,
        source: 'template',
        recommendation: RECOMMENDATION,
      });
    }
    const style = findStaticStyle(el);
    if (style?.value && HEX_COLOR.test(style.value.content)) {
      diagnostics.push({
        file: ctx.file,
        line: style.loc.start.line,
        column: style.loc.start.column,
        endLine: style.loc.end.line,
        endColumn: style.loc.end.column,
        ruleId: RULE_ID,
        severity: 'warn',
        message: `<${el.tag}> embeds a raw hex color in an inline style. ${MESSAGE}`,
        source: 'template',
        recommendation: RECOMMENDATION,
      });
    }
  });
  return { diagnostics };
}
