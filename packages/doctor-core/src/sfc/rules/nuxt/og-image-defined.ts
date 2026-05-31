import { readFileSync } from 'node:fs';
import { parseSync } from 'oxc-parser';
import type { Diagnostic } from '../../../types.js';
import { isNuxtPageFile } from '../../../nuxt/file-role.js';
import type { SfcRuleContext, SfcRuleResult } from '../types.js';

const RULE_ID = 'nuxt-doctor/seo/og-image-defined';

const MESSAGE =
  'Page uses SEO meta but has no og:image property. Open Graph images improve social sharing previews. Add an og:image value or install @nuxtjs/og-image for automatic OG images.';

const RECOMMENDATION =
  'Add ogImage: "/path/to/image.png" to useSeoMeta / useHead, or install @nuxtjs/og-image.';

function hasOgImageInCall(
  program: ReturnType<typeof parseSync>['program'],
): boolean {
  for (const stmt of program.body) {
    if (stmt.type !== 'ExpressionStatement') continue;
    const call = stmt.expression;
    if (call.type !== 'CallExpression') continue;
    if (call.callee.type !== 'Identifier') continue;
    const name = call.callee.name;
    if (name !== 'useSeoMeta' && name !== 'useHead') continue;
    const firstArg = call.arguments[0];
    if (!firstArg || firstArg.type !== 'ObjectExpression') continue;
    for (const prop of firstArg.properties) {
      if (prop.type !== 'Property') continue;
      if (prop.key.type === 'Identifier' && prop.key.name === 'ogImage')
        return true;
      if (prop.key.type === 'Literal' && prop.key.value === 'og:image')
        return true;
    }
  }
  return false;
}

function hasOgImageDep(packageJsonPath: string): boolean {
  try {
    const raw = readFileSync(packageJsonPath, 'utf8');
    const pkg = JSON.parse(raw);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    return '@nuxtjs/og-image' in deps || 'nuxt-og-image' in deps;
  } catch {
    return false;
  }
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
  if (hasOgImageInCall(program)) return { diagnostics: [] };
  if (ctx.projectInfo.packageJsonPath === null) return { diagnostics: [] };
  if (hasOgImageDep(ctx.projectInfo.packageJsonPath))
    return { diagnostics: [] };
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
