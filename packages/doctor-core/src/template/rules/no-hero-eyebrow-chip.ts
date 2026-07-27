import type { ElementNode } from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import { collectClassSources } from '../class-attr-helpers.js';
import { walkElements } from '../walk.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

const RULE_ID = 'vue-doctor/design/no-hero-eyebrow-chip';
const MESSAGE =
  'The uppercase-tracked eyebrow chip above a hero heading is the AI landing-page hallmark. Anchor the hero on the headline itself.';
const RECOMMENDATION =
  'Drop the eyebrow chip and let the headline carry the hero; use weight and scale for hierarchy.';

const NODE_ELEMENT = 1;

const UPPERCASE = /\buppercase\b/;
const TRACKING = /\btracking-(?!normal\b)[a-z0-9-]+\b/;
const ROUNDED_FULL = /\brounded-full\b/;
const BORDER = /\bborder\b/;
const CHIP_PADDING = /\bpx-(?:3|4)\b/;

function isEyebrowChip(el: ElementNode): boolean {
  const text = collectClassSources(el)
    .map((s) => s.text)
    .join(' ');
  if (!UPPERCASE.test(text)) return false;
  if (!TRACKING.test(text)) return false;
  const pill =
    ROUNDED_FULL.test(text) || (BORDER.test(text) && CHIP_PADDING.test(text));
  return pill;
}

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];
  walkElements(ctx.template, (parent: ElementNode) => {
    const children = parent.children.filter(
      (c): c is ElementNode => c.type === NODE_ELEMENT,
    );
    for (let i = 1; i < children.length; i += 1) {
      const heading = children[i];
      const prev = children[i - 1];
      if (heading.tag !== 'h1') continue;
      if (!isEyebrowChip(prev)) continue;
      diagnostics.push({
        file: ctx.file,
        line: prev.loc.start.line,
        column: prev.loc.start.column,
        endLine: prev.loc.end.line,
        endColumn: prev.loc.end.column,
        ruleId: RULE_ID,
        severity: 'warn',
        message: `<${prev.tag}> is an uppercase-tracked eyebrow chip above an <h1>. ${MESSAGE}`,
        source: 'template',
        recommendation: RECOMMENDATION,
      });
    }
  });
  return { diagnostics };
}
