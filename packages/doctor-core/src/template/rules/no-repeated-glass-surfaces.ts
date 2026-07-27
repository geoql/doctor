import type { ElementNode } from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import { collectClassSources } from '../class-attr-helpers.js';
import { walkElements } from '../walk.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

const RULE_ID = 'vue-doctor/design/no-repeated-glass-surfaces';
const MESSAGE =
  'Repeated frosted-glass panels are stock AI-design shorthand. Restrict glass to one surface or drop the effect.';
const RECOMMENDATION =
  'Limit the frosted-glass treatment to a single surface, or use solid tokened panels instead.';

const NODE_ELEMENT = 1;

const BACKDROP_BLUR = /\bbackdrop-blur(?:-[a-z0-9]+)?\b/;
const BORDER = /\bborder\b/;
const TRANSLUCENT_BG =
  /\bbg-white\/\d{1,3}\b|\bbg-black\/\d{1,3}\b|\bbg-[a-z]+-\d{2,3}\/\d{1,3}\b|\bbg-\[oklch\([^\]]*\/\s*0?\.\d+\)\]/;

function isGlass(el: ElementNode): boolean {
  const text = collectClassSources(el)
    .map((s) => s.text)
    .join(' ');
  return (
    BACKDROP_BLUR.test(text) && BORDER.test(text) && TRANSLUCENT_BG.test(text)
  );
}

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];
  walkElements(ctx.template, (parent: ElementNode) => {
    const children = parent.children.filter(
      (c): c is ElementNode => c.type === NODE_ELEMENT,
    );
    const glass = children.filter(isGlass);
    if (glass.length < 3) return;
    diagnostics.push({
      file: ctx.file,
      line: parent.loc.start.line,
      column: parent.loc.start.column,
      endLine: parent.loc.end.line,
      endColumn: parent.loc.end.column,
      ruleId: RULE_ID,
      severity: 'warn',
      message: `<${parent.tag}> stacks ${glass.length} frosted-glass panels. ${MESSAGE}`,
      source: 'template',
      recommendation: RECOMMENDATION,
    });
  });
  return { diagnostics };
}
