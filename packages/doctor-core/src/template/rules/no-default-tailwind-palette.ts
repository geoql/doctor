import type { ElementNode } from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import { collectClassSources } from '../class-attr-helpers.js';
import { walkElements } from '../walk.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

const DEFAULT_PALETTE =
  /(?:^|[\s:'"`])(?:bg|text|border|ring|shadow|from|via|to|accent|caret|fill|stroke|outline|decoration|divide|ring-offset|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];
  walkElements(ctx.template, (el: ElementNode) => {
    for (const source of collectClassSources(el)) {
      if (!DEFAULT_PALETTE.test(source.text)) continue;
      diagnostics.push({
        file: ctx.file,
        line: source.loc.start.line,
        column: source.loc.start.column,
        endLine: source.loc.end.line,
        endColumn: source.loc.end.column,
        ruleId: 'vue-doctor/design/no-default-tailwind-palette',
        severity: 'warn',
        message: `<${el.tag}> uses a default Tailwind palette utility (e.g. bg-blue-600). The default palette produces generic UI; map colors to brand tokens.`,
        source: 'template',
        recommendation:
          'Map the color to a brand token (e.g. bg-primary-600) defined in your @theme instead of the default palette.',
      });
    }
  });
  return { diagnostics };
}
