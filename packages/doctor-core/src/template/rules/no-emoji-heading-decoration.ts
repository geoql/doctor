import type { ElementNode } from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import { walkElements } from '../walk.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

const RULE_ID = 'vue-doctor/design/no-emoji-heading-decoration';
const MESSAGE =
  'Emoji-decorated headings are AI-content shorthand. Use typographic hierarchy for emphasis.';
const RECOMMENDATION =
  'Remove the leading/trailing emoji and rely on font-size and weight for emphasis.';

const NODE_TEXT = 2;
const HEADING_TAGS = new Set(['h1', 'h2', 'h3']);

const STARTS_WITH_EMOJI = /^[\p{Extended_Pictographic}]/u;
const ENDS_WITH_EMOJI = /[\p{Extended_Pictographic}]$/u;

function headingText(el: ElementNode): string {
  let text = '';
  for (const child of el.children) {
    if (child.type === NODE_TEXT) text += child.content;
  }
  return text.trim();
}

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];
  walkElements(ctx.template, (el: ElementNode) => {
    if (!HEADING_TAGS.has(el.tag)) return;
    const text = headingText(el);
    if (text.length === 0) return;
    if (!STARTS_WITH_EMOJI.test(text) && !ENDS_WITH_EMOJI.test(text)) return;
    diagnostics.push({
      file: ctx.file,
      line: el.loc.start.line,
      column: el.loc.start.column,
      endLine: el.loc.end.line,
      endColumn: el.loc.end.column,
      ruleId: RULE_ID,
      severity: 'warn',
      message: `<${el.tag}> is decorated with an emoji. ${MESSAGE}`,
      source: 'template',
      recommendation: RECOMMENDATION,
    });
  });
  return { diagnostics };
}
