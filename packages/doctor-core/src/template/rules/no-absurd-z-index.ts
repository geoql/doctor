import type { ElementNode } from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import { collectClassSources, findStaticStyle } from '../class-attr-helpers.js';
import { walkElements } from '../walk.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

const ABSURD_THRESHOLD = 1000;
const ARBITRARY_Z = /(?:^|[\s:'"`])-?z-\[(\d+)\]/;
const INLINE_Z = /z-index\s*:\s*(\d+)/;

const RULE_ID = 'vue-doctor/design/no-absurd-z-index';
const MESSAGE =
  'huge z-index values usually paper over layering bugs instead of fixing stacking context.';
const RECOMMENDATION =
  'Use a small, tokenized z-index scale (e.g. z-modal) and fix the underlying stacking context.';

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];
  walkElements(ctx.template, (el: ElementNode) => {
    for (const source of collectClassSources(el)) {
      const match = ARBITRARY_Z.exec(source.text);
      if (!match || Number(match[1]) < ABSURD_THRESHOLD) continue;
      diagnostics.push({
        file: ctx.file,
        line: source.loc.start.line,
        column: source.loc.start.column,
        endLine: source.loc.end.line,
        endColumn: source.loc.end.column,
        ruleId: RULE_ID,
        severity: 'warn',
        message: `<${el.tag}> uses an absurd z-index class (>= ${ABSURD_THRESHOLD}); ${MESSAGE}`,
        source: 'template',
        recommendation: RECOMMENDATION,
      });
    }
    const style = findStaticStyle(el);
    if (style?.value) {
      const match = INLINE_Z.exec(style.value.content);
      if (match && Number(match[1]) >= ABSURD_THRESHOLD) {
        diagnostics.push({
          file: ctx.file,
          line: style.loc.start.line,
          column: style.loc.start.column,
          endLine: style.loc.end.line,
          endColumn: style.loc.end.column,
          ruleId: RULE_ID,
          severity: 'warn',
          message: `<${el.tag}> uses an absurd inline z-index (>= ${ABSURD_THRESHOLD}); ${MESSAGE}`,
          source: 'template',
          recommendation: RECOMMENDATION,
        });
      }
    }
  });
  return { diagnostics };
}
