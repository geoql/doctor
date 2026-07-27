import type { ElementNode } from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import { collectClassSources } from '../class-attr-helpers.js';
import { walkElements } from '../walk.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

const ARBITRARY_VALUE = /\[[^\]]+\]/;

// Matches a bracket that belongs to a Tailwind VARIANT (`data-[state=open]:`,
// `supports-[display:grid]:`) — the trailing `:` lookahead is what separates a
// variant from a real arbitrary value. Variants have no token equivalent.
const VARIANT_SELECTOR =
  /(?:^|[\s:])(?:group|peer)?-?(?:data|aria|supports|has|group|peer|not|in)-\[[^\]]*\](?=:)/g;

// Matches quoted fragments in a bound `:class` JS expression. Scanning only
// these keeps `[color, tone]` (array binding) and `TONE[row.sev]` (member
// access) out — both are JS brackets, not Tailwind arbitrary values.
const STRING_FRAGMENT = /'[^']*'|"[^"]*"|`[^`]*`/g;

function scannableClassText(text: string, isBound: boolean): string {
  const raw = isBound
    ? (text.match(STRING_FRAGMENT) ?? [])
        .map((fragment) => fragment.slice(1, -1))
        .join(' ')
    : text;
  return raw.replace(VARIANT_SELECTOR, '');
}

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];
  walkElements(ctx.template, (el: ElementNode) => {
    for (const source of collectClassSources(el)) {
      const scannable = scannableClassText(source.text, source.bound);
      if (!ARBITRARY_VALUE.test(scannable)) continue;
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
