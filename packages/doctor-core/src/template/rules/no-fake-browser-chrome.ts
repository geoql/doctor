import type { ElementNode } from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import { collectClassSources } from '../class-attr-helpers.js';
import { walkElements } from '../walk.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

const RULE_ID = 'vue-doctor/design/no-fake-browser-chrome';
const MESSAGE =
  'Fake macOS traffic-light dots are template kitsch. Use real product chrome or none.';
const RECOMMENDATION =
  'Remove the decorative traffic-light dots or replace them with real window controls.';

const NODE_ELEMENT = 1;

const DOT = /\brounded-full\b/;
const DOT_WIDTH = /\bw-(?:2|2\.5|3)\b/;
const RED = /\bbg-red-\d{2,3}\b/;
const YELLOW = /\bbg-(?:yellow|amber)-\d{2,3}\b/;
const GREEN = /\bbg-(?:green|emerald)-\d{2,3}\b/;

function isTrafficDot(
  el: ElementNode,
): { red: boolean; yellow: boolean; green: boolean } | null {
  if (el.tag !== 'div') return null;
  const text = collectClassSources(el)
    .map((s) => s.text)
    .join(' ');
  if (!DOT.test(text) || !DOT_WIDTH.test(text)) return null;
  const red = RED.test(text);
  const yellow = YELLOW.test(text);
  const green = GREEN.test(text);
  if (!red && !yellow && !green) return null;
  return { red, yellow, green };
}

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];
  walkElements(ctx.template, (parent: ElementNode) => {
    const dots = parent.children.filter(
      (c): c is ElementNode => c.type === NODE_ELEMENT,
    );
    let red = false;
    let yellow = false;
    let green = false;
    let count = 0;
    for (const dot of dots) {
      const hit = isTrafficDot(dot);
      if (!hit) continue;
      count += 1;
      red = red || hit.red;
      yellow = yellow || hit.yellow;
      green = green || hit.green;
    }
    if (count >= 3 && red && yellow && green) {
      diagnostics.push({
        file: ctx.file,
        line: parent.loc.start.line,
        column: parent.loc.start.column,
        endLine: parent.loc.end.line,
        endColumn: parent.loc.end.column,
        ruleId: RULE_ID,
        severity: 'warn',
        message: `<${parent.tag}> contains fake macOS traffic-light dots. ${MESSAGE}`,
        source: 'template',
        recommendation: RECOMMENDATION,
      });
    }
  });
  return { diagnostics };
}
