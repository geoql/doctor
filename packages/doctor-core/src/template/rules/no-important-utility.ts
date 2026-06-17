import type { ElementNode } from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import { collectClassSources } from '../class-attr-helpers.js';
import { walkElements } from '../walk.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

const IMPORTANT_UTILITY = /(?:^|[\s:'"`])!-?[a-z][a-z0-9-]*/;

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];
  walkElements(ctx.template, (el: ElementNode) => {
    for (const source of collectClassSources(el)) {
      if (!IMPORTANT_UTILITY.test(source.text)) continue;
      diagnostics.push({
        file: ctx.file,
        line: source.loc.start.line,
        column: source.loc.start.column,
        endLine: source.loc.end.line,
        endColumn: source.loc.end.column,
        ruleId: 'vue-doctor/design/no-important-utility',
        severity: 'warn',
        message: `<${el.tag}> uses a !important Tailwind utility (e.g. !bg-red-500). !important is a specificity escape hatch that makes maintenance harder.`,
        source: 'template',
        recommendation:
          'Remove the ! prefix and resolve the specificity conflict at its source instead of forcing !important.',
      });
    }
  });
  return { diagnostics };
}
