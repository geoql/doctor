import type { ElementNode } from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import { collectClassSources } from '../class-attr-helpers.js';
import { walkElements } from '../walk.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

const ARBITRARY_VALUE = /\[[^\]]+\]/;

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];
  walkElements(ctx.template, (el: ElementNode) => {
    for (const source of collectClassSources(el)) {
      if (!ARBITRARY_VALUE.test(source.text)) continue;
      diagnostics.push({
        file: ctx.file,
        line: source.loc.start.line,
        column: source.loc.start.column,
        endLine: source.loc.end.line,
        endColumn: source.loc.end.column,
        ruleId: 'vue-doctor/design/no-arbitrary-tailwind-values',
        severity: 'warn',
        message: `<${el.tag}> uses a Tailwind arbitrary value (e.g. w-[412px]). Arbitrary values are design-system debt; repeated values should become @theme tokens.`,
        source: 'template',
        recommendation:
          'Replace the arbitrary value with a design token defined in your @theme (e.g. w-container-lg).',
      });
    }
  });
  return { diagnostics };
}
