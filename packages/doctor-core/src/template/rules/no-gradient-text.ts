import type { ElementNode } from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import { collectClassSources } from '../class-attr-helpers.js';
import { walkElements } from '../walk.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

const RULE_ID = 'vue-doctor/design/no-gradient-text';
const MESSAGE =
  'Gradient-clipped text is the AI landing-page tell. Use a solid tokened color + weight contrast instead.';
const RECOMMENDATION =
  'Replace the gradient-clipped text with a solid semantic color token and rely on font-weight contrast for emphasis.';

const BG_CLIP_TEXT = /\bbg-clip-text\b|\[-webkit-background-clip:text\]/;
const BG_GRADIENT =
  /\bbg-gradient-[a-z-]+\b|\bbg-linear-[a-z0-9-]+\b|\bbg-\[linear-gradient\(/;

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];
  walkElements(ctx.template, (el: ElementNode) => {
    for (const source of collectClassSources(el)) {
      if (!BG_CLIP_TEXT.test(source.text)) continue;
      if (!BG_GRADIENT.test(source.text)) continue;
      diagnostics.push({
        file: ctx.file,
        line: source.loc.start.line,
        column: source.loc.start.column,
        endLine: source.loc.end.line,
        endColumn: source.loc.end.column,
        ruleId: RULE_ID,
        severity: 'warn',
        message: `<${el.tag}> clips a gradient onto text. ${MESSAGE}`,
        source: 'template',
        recommendation: RECOMMENDATION,
      });
    }
  });
  return { diagnostics };
}
