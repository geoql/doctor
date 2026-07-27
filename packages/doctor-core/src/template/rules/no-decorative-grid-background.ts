import type { ElementNode } from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import { collectClassSources } from '../class-attr-helpers.js';
import { walkElements } from '../walk.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

const RULE_ID = 'vue-doctor/design/no-decorative-grid-background';
const MESSAGE =
  'Decorative coordinate-grid backgrounds are stock AI marketing shorthand. Use plain surface tokens or purposeful imagery.';
const RECOMMENDATION =
  'Drop the grid/dot backdrop or replace it with a solid surface token or meaningful illustration.';

const NAMED_GRID = /\bbg-(?:grid|dot)\b|\bgrid-pattern\b/;
const LAYERED_GRID =
  /\bbg-\[(?:repeating-)?linear-gradient\([^\]]*\)\][^"']*\bbg-\[(?:repeating-)?linear-gradient\(/;

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];
  walkElements(ctx.template, (el: ElementNode) => {
    for (const source of collectClassSources(el)) {
      if (!NAMED_GRID.test(source.text) && !LAYERED_GRID.test(source.text)) {
        continue;
      }
      diagnostics.push({
        file: ctx.file,
        line: source.loc.start.line,
        column: source.loc.start.column,
        endLine: source.loc.end.line,
        endColumn: source.loc.end.column,
        ruleId: RULE_ID,
        severity: 'warn',
        message: `<${el.tag}> renders a decorative coordinate-grid background. ${MESSAGE}`,
        source: 'template',
        recommendation: RECOMMENDATION,
      });
    }
  });
  return { diagnostics };
}
