import type { ElementNode, TemplateChildNode } from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import { collectClassSources } from '../class-attr-helpers.js';
import { walkElements } from '../walk.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

const RULE_ID = 'vue-doctor/design/no-decorative-blur-orb';
const MESSAGE =
  'Decorative blurred orbs are a stock landing-page cliché. Replace with real content or remove.';
const RECOMMENDATION =
  'Delete the decorative orb or replace it with meaningful content; lean on layout and type for visual interest.';

const NODE_TEXT = 2;
const NODE_INTERPOLATION = 5;

const ABSOLUTE = /\babsolute\b/;
const BLUR = /\bblur(?:-[a-z0-9]+)?\b/;
const HUED_BG =
  /\bbg-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;

function isEmptyDiv(el: ElementNode): boolean {
  if (el.tag !== 'div') return false;
  for (const child of el.children as TemplateChildNode[]) {
    if (child.type === NODE_TEXT && child.content.trim().length > 0)
      return false;
    if (child.type === NODE_INTERPOLATION) return false;
    if (child.type === 1) return false;
  }
  return true;
}

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];
  walkElements(ctx.template, (el: ElementNode) => {
    if (!isEmptyDiv(el)) return;
    for (const source of collectClassSources(el)) {
      if (!ABSOLUTE.test(source.text)) continue;
      if (!BLUR.test(source.text)) continue;
      if (!HUED_BG.test(source.text)) continue;
      diagnostics.push({
        file: ctx.file,
        line: source.loc.start.line,
        column: source.loc.start.column,
        endLine: source.loc.end.line,
        endColumn: source.loc.end.column,
        ruleId: RULE_ID,
        severity: 'warn',
        message: `<${el.tag}> is an empty blurred decorative orb. ${MESSAGE}`,
        source: 'template',
        recommendation: RECOMMENDATION,
      });
    }
  });
  return { diagnostics };
}
