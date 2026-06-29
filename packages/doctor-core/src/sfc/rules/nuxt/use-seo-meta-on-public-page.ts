import { parseSync } from 'oxc-parser';
import type { Diagnostic } from '../../../types.js';
import { isNuxtPageFile } from '../../../nuxt/file-role.js';
import type { SfcRuleContext, SfcRuleResult } from '../types.js';

const RULE_ID = 'nuxt-doctor/seo/useSeoMeta-on-public-page';

const MESSAGE =
  'Public page component is missing SEO metadata. Add useSeoMeta, useHead, or definePageMeta with a title so search engines can index it properly.';

const RECOMMENDATION =
  'Call useSeoMeta({ title: "..." }) in<script setup> to define page title and meta tags for search engines and social previews.';

const SEO_PRIMITIVES = new Set(['useSeoMeta', 'useHead', 'definePageMeta']);

// A `use…Seo…` wrapper composable (e.g. usePageSeo) calls the SEO primitives
// internally, so the page is covered even without a direct primitive call.
function isSeoWrapperName(name: string): boolean {
  if (SEO_PRIMITIVES.has(name)) return false;
  return /^use[a-z]*seo/i.test(name);
}

function hasTitleInCall(
  program: ReturnType<typeof parseSync>['program'],
): boolean {
  for (const stmt of program.body) {
    if (stmt.type !== 'ExpressionStatement') continue;
    const call = stmt.expression;
    if (call.type !== 'CallExpression') continue;
    if (call.callee.type !== 'Identifier') continue;
    const name = call.callee.name;
    if (isSeoWrapperName(name)) return true;
    if (
      name !== 'useSeoMeta' &&
      name !== 'useHead' &&
      name !== 'definePageMeta'
    )
      continue;
    const firstArg = call.arguments[0];
    if (!firstArg || firstArg.type !== 'ObjectExpression') continue;
    for (const prop of firstArg.properties) {
      if (prop.type !== 'Property') continue;
      if (prop.key.type === 'Identifier' && prop.key.name === 'title')
        return true;
      if (prop.key.type === 'Literal' && prop.key.value === 'title')
        return true;
    }
  }
  return false;
}

export function check(ctx: SfcRuleContext): SfcRuleResult {
  if (!isNuxtPageFile(ctx.relativePath)) return { diagnostics: [] };
  const { scriptSetup } = ctx.descriptor;
  if (!scriptSetup) return { diagnostics: [] };
  const lang = scriptSetup.lang === 'ts' ? 'ts' : 'js';
  const { program } = parseSync(`script.${lang}`, scriptSetup.content, {
    sourceType: 'module',
    lang,
  });
  if (hasTitleInCall(program)) return { diagnostics: [] };
  const { line, column } = scriptSetup.loc.start;
  const diagnostics: Diagnostic[] = [
    {
      file: ctx.file,
      line,
      column,
      ruleId: RULE_ID,
      severity: 'warn',
      message: MESSAGE,
      source: 'sfc',
      recommendation: RECOMMENDATION,
    },
  ];
  return { diagnostics };
}
