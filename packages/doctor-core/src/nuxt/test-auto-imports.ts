import { readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import type { Diagnostic } from '../types.js';
import { isTestSurfacePath } from '../test-surface.js';

const RULE_ID = 'nuxt-doctor/ai-slop/no-explicit-imports-of-auto-imported';

const VITEST_CONFIG_FILES = [
  'vitest.config.ts',
  'vitest.config.mts',
  'vitest.config.cts',
  'vitest.config.js',
  'vitest.config.mjs',
  'vitest.config.cjs',
  'vitest.workspace.ts',
  'vitest.workspace.mts',
  'vitest.workspace.js',
  'vitest.workspace.mjs',
  'vitest.workspace.json',
];

// `defineVitestConfig` / `@nuxt/test-utils/config` or `environment: 'nuxt'`
// put tests in the Nuxt runtime, where auto-imports exist.
const NUXT_ENV_CONFIG =
  /defineVitestConfig|@nuxt\/test-utils\/config|environment['"]?\s*:\s*['"]nuxt['"]/;
const NUXT_ENV_PRAGMA = /@vitest-environment\s+nuxt\b/;

async function readText(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return null;
  }
}

/** True when the project's vitest config runs tests in the Nuxt environment. */
export async function usesNuxtVitestEnvironment(
  rootDir: string,
): Promise<boolean> {
  for (const name of VITEST_CONFIG_FILES) {
    const text = await readText(join(rootDir, name));
    if (text !== null && NUXT_ENV_CONFIG.test(text)) return true;
  }
  return false;
}

/**
 * Drop `no-explicit-imports-of-auto-imported` findings in test files that do
 * not run in the Nuxt environment. Plain vitest tests get no Nuxt
 * auto-imports, so their explicit imports are required (issue #325). A test
 * file still counts as Nuxt when the vitest config or a per-file
 * `@vitest-environment nuxt` pragma selects the Nuxt environment.
 */
export async function dropAutoImportFindingsInPlainTests(
  diagnostics: Diagnostic[],
  rootDir: string,
): Promise<Diagnostic[]> {
  const candidates = diagnostics.filter(
    (d) =>
      d.ruleId === RULE_ID &&
      isTestSurfacePath(relative(rootDir, resolve(rootDir, d.file))),
  );
  if (candidates.length === 0) return diagnostics;
  if (await usesNuxtVitestEnvironment(rootDir)) return diagnostics;
  const plain = new Set<Diagnostic>();
  for (const d of candidates) {
    const source = await readText(resolve(rootDir, d.file));
    if (source === null || !NUXT_ENV_PRAGMA.test(source)) plain.add(d);
  }
  return diagnostics.filter((d) => !plain.has(d));
}
