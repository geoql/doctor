import type { ElementNode } from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import { collectClassSources, findStaticStyle } from '../class-attr-helpers.js';
import { walkElements } from '../walk.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

const RULE_ID = 'vue-doctor/design/no-pure-black-background';
const MESSAGE =
  'Pure #000 backgrounds are the dark-mode tell. Use an off-shade token like `bg-ink` or `oklch(0.18 ...)`.';
const RECOMMENDATION =
  'Swap the pure-black background for an off-black token (e.g. bg-ink) so surfaces keep depth in dark mode.';

const ROOT_TAGS = new Set(['body', 'html', 'main']);
const ROOT_CLASS = /\b(?:min-h-screen|h-screen|h-dvh|min-h-dvh)\b/;
const BLACK_CLASS = /\bbg-black\b|\bbg-\[#000(?:000)?\]/;
const BLACK_STYLE = /background(?:-color)?\s*:\s*(?:#000(?:000)?\b|black\b)/i;

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];
  walkElements(ctx.template, (el: ElementNode) => {
    const sources = collectClassSources(el);
    const isRootTag = ROOT_TAGS.has(el.tag);
    const isFullHeight = sources.some((s) => ROOT_CLASS.test(s.text));
    if (!isRootTag && !isFullHeight) return;
    for (const source of sources) {
      if (!BLACK_CLASS.test(source.text)) continue;
      diagnostics.push(makeDiag(ctx.file, el.tag, source.loc, 'a class'));
    }
    const style = findStaticStyle(el);
    if (style?.value && BLACK_STYLE.test(style.value.content)) {
      diagnostics.push(
        makeDiag(ctx.file, el.tag, style.loc, 'an inline style'),
      );
    }
  });
  return { diagnostics };
}

function makeDiag(
  file: string,
  tag: string,
  loc: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  },
  where: string,
): Diagnostic {
  return {
    file,
    line: loc.start.line,
    column: loc.start.column,
    endLine: loc.end.line,
    endColumn: loc.end.column,
    ruleId: RULE_ID,
    severity: 'warn',
    message: `<${tag}> paints a pure-black background via ${where}. ${MESSAGE}`,
    source: 'template',
    recommendation: RECOMMENDATION,
  };
}
