import type { ElementNode } from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import { collectClassSources } from '../class-attr-helpers.js';
import { walkElements } from '../walk.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

const RULE_ID = 'vue-doctor/design/no-radial-halo';
const MESSAGE =
  'Radial halos on dark surfaces are AI-slop hero decoration. Use restrained lighting or none.';
const RECOMMENDATION =
  'Remove the radial-gradient halo or replace it with a subtle, purposeful surface treatment.';

const ABSOLUTE = /\babsolute\b/;
const RADIAL = /\bbg-\[radial-gradient\(/;
const BLUR = /\bblur(?:-[a-z0-9]+)?\b/;

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];
  walkElements(ctx.template, (el: ElementNode) => {
    for (const source of collectClassSources(el)) {
      if (!ABSOLUTE.test(source.text)) continue;
      if (!RADIAL.test(source.text)) continue;
      if (!BLUR.test(source.text)) continue;
      diagnostics.push({
        file: ctx.file,
        line: source.loc.start.line,
        column: source.loc.start.column,
        endLine: source.loc.end.line,
        endColumn: source.loc.end.column,
        ruleId: RULE_ID,
        severity: 'warn',
        message: `<${el.tag}> paints an absolute radial-gradient halo. ${MESSAGE}`,
        source: 'template',
        recommendation: RECOMMENDATION,
      });
    }
  });
  return { diagnostics };
}
