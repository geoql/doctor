import { readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import type { Diagnostic } from './types.js';
import { isTestSurfacePath } from './test-surface.js';

const CONFIG_EXTS = ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs'];

const VITEST_CONFIG_FILES = [
  ...CONFIG_EXTS.map((ext) => `vitest.config.${ext}`),
  ...['ts', 'mts', 'js', 'mjs', 'json'].map((ext) => `vitest.workspace.${ext}`),
];

const VITE_CONFIG_FILES = CONFIG_EXTS.map((ext) => `vite.config.${ext}`);

// `defineVitestConfig` / `@nuxt/test-utils/config` or `environment: 'nuxt'`
// put tests in the Nuxt runtime, where auto-imports exist.
const NUXT_ENV_CONFIG =
  /defineVitestConfig|@nuxt\/test-utils\/config|environment['"]?\s*:\s*['"]nuxt['"]/;
const NUXT_ENV_PRAGMA = /@vitest-environment\s+nuxt\b/;

const AUTO_IMPORT_PLUGIN = /unplugin-auto-import/;
const IMPORTS_VITE_CONFIG = /['"]\.\/vite\.config(?:\.[cm]?[jt]s)?['"]/;

async function readText(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return null;
  }
}

async function readAll(rootDir: string, names: string[]): Promise<string[]> {
  const texts: string[] = [];
  for (const name of names) {
    const text = await readText(join(rootDir, name));
    if (text !== null) texts.push(text);
  }
  return texts;
}

/** True when the project's vitest config runs tests in the Nuxt environment. */
export async function usesNuxtVitestEnvironment(
  rootDir: string,
): Promise<boolean> {
  const configs = await readAll(rootDir, VITEST_CONFIG_FILES);
  return configs.some((text) => NUXT_ENV_CONFIG.test(text));
}

/**
 * True when vitest loads `unplugin-auto-import`: a vitest config that adds
 * AutoImport itself or imports `./vite.config` (e.g. `mergeConfig`) that adds
 * it, or, without a vitest config, the `vite.config` vitest falls back to.
 */
export async function vitestLoadsAutoImport(rootDir: string): Promise<boolean> {
  const vitestConfigs = await readAll(rootDir, VITEST_CONFIG_FILES);
  const viteLoadsIt = (await readAll(rootDir, VITE_CONFIG_FILES)).some((text) =>
    AUTO_IMPORT_PLUGIN.test(text),
  );
  if (vitestConfigs.length === 0) return viteLoadsIt;
  return vitestConfigs.some(
    (text) =>
      AUTO_IMPORT_PLUGIN.test(text) ||
      (viteLoadsIt && IMPORTS_VITE_CONFIG.test(text)),
  );
}

interface AutoImportRule {
  ruleId: string;
  /** Project-wide: do tests run with this rule's auto-imports? */
  testsAutoImport: (rootDir: string) => Promise<boolean>;
  /** Per-file opt-in, when the test runner offers one. */
  fileOptsIn: (source: string) => boolean;
}

// Rules that flag explicit imports of auto-imported symbols. In a test file
// those imports are required unless the test runner provides the same
// auto-imports (issue #325).
const AUTO_IMPORT_RULES: AutoImportRule[] = [
  {
    ruleId: 'nuxt-doctor/ai-slop/no-explicit-imports-of-auto-imported',
    testsAutoImport: usesNuxtVitestEnvironment,
    fileOptsIn: (source) => NUXT_ENV_PRAGMA.test(source),
  },
  {
    ruleId: 'vue-doctor/no-imports-from-vue-when-auto-imported',
    testsAutoImport: vitestLoadsAutoImport,
    // vitest has no per-file way to add a Vite plugin.
    fileOptsIn: () => false,
  },
];

/**
 * Drop auto-import findings in test files whose test runner does not provide
 * those auto-imports: plain vitest tests need their explicit imports. Nuxt
 * tests count when vitest uses the Nuxt environment (config or a per-file
 * `@vitest-environment nuxt` comment); Vue tests count when vitest loads
 * unplugin-auto-import.
 */
export async function dropAutoImportFindingsInPlainTests(
  diagnostics: Diagnostic[],
  rootDir: string,
): Promise<Diagnostic[]> {
  const drop = new Set<Diagnostic>();
  for (const rule of AUTO_IMPORT_RULES) {
    const candidates = diagnostics.filter(
      (d) =>
        d.ruleId === rule.ruleId &&
        isTestSurfacePath(relative(rootDir, resolve(rootDir, d.file))),
    );
    if (candidates.length === 0) continue;
    if (await rule.testsAutoImport(rootDir)) continue;
    for (const d of candidates) {
      const source = await readText(resolve(rootDir, d.file));
      if (source === null || !rule.fileOptsIn(source)) drop.add(d);
    }
  }
  if (drop.size === 0) return diagnostics;
  return diagnostics.filter((d) => !drop.has(d));
}
