import type { ElementNode } from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import { collectClassSources } from '../class-attr-helpers.js';
import { walkElements } from '../walk.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

const RULE_ID = 'vue-doctor/design/no-uniform-feature-card-grid';
const MESSAGE =
  'Uniform feature-card grids where every card is the same shape produce anonymous marketing. Break the grid with an oversized card, a testimonial, or asymmetric spans.';
const RECOMMENDATION =
  'Vary one card (span, size, or content type) so the grid reads as designed rather than generated.';

const NODE_ELEMENT = 1;

const GRID = /\bgrid\b/;
const GRID_COLS = /\bgrid-cols-(?:2|3|4)\b/;

function classString(el: ElementNode): string {
  return collectClassSources(el)
    .map((s) => s.text.trim())
    .join('|');
}

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];
  walkElements(ctx.template, (parent: ElementNode) => {
    const parentClasses = collectClassSources(parent)
      .map((s) => s.text)
      .join(' ');
    if (!GRID.test(parentClasses) || !GRID_COLS.test(parentClasses)) return;
    const children = parent.children.filter(
      (c): c is ElementNode => c.type === NODE_ELEMENT,
    );
    if (children.length < 3) return;
    const first = classString(children[0]);
    if (first.length === 0) return;
    const allSame = children.every((c) => classString(c) === first);
    if (!allSame) return;
    diagnostics.push({
      file: ctx.file,
      line: parent.loc.start.line,
      column: parent.loc.start.column,
      endLine: parent.loc.end.line,
      endColumn: parent.loc.end.column,
      ruleId: RULE_ID,
      severity: 'warn',
      message: `<${parent.tag}> is a uniform feature-card grid of ${children.length} identical cards. ${MESSAGE}`,
      source: 'template',
      recommendation: RECOMMENDATION,
    });
  });
  return { diagnostics };
}
