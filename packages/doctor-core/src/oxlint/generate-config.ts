import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Severity } from '../types.js';

export interface GenerateConfigInput {
  pluginPaths: string[];
  ruleOverrides?: Record<string, Severity | 'off'>;
  rootDir?: string;
  framework?: 'vue' | 'nuxt';
  exclude?: string[];
}

export interface GeneratedConfig {
  configPath: string;
  cleanup: () => Promise<void>;
}

const VUE_DEFAULT_RULES: Record<string, Severity> = {
  'vue/no-export-in-script-setup': 'error',
  'vue/require-typed-ref': 'warn',
  'vue/no-arrow-functions-in-watch': 'error',
  'vue/no-deprecated-data-object-declaration': 'error',
  'vue/no-deprecated-events-api': 'error',
  'vue/no-deprecated-destroyed-lifecycle': 'error',
  'vue/no-deprecated-model-definition': 'error',
  'vue/no-deprecated-delete-set': 'error',
  'vue/no-deprecated-vue-config-keycodes': 'error',
  'vue/no-lifecycle-after-await': 'error',
  'vue/no-this-in-before-route-enter': 'error',
  'vue/return-in-computed-property': 'error',
  'vue/valid-define-emits': 'error',
  'vue/valid-define-props': 'error',
  'vue/no-required-prop-with-default': 'warn',
  'vue/prefer-import-from-vue': 'warn',
  'vue/no-import-compiler-macros': 'warn',
  'vue/no-multiple-slot-args': 'warn',
  'vue/require-default-export': 'warn',
  'vue-doctor/no-em-dash-in-string': 'warn',
  'vue-doctor/no-non-null-assertion-on-ref-value': 'warn',
  'vue-doctor/no-imports-from-vue-when-auto-imported': 'warn',
  'vue-doctor/reactivity/watch-without-cleanup': 'warn',
  'vue-doctor/composition/prefer-script-setup-for-new-files': 'warn',
  'vue-doctor/composition/defineProps-typed': 'warn',
  'vue-doctor/security/no-inner-html': 'error',
  'vue-doctor/security/no-eval-like': 'error',
  'vue-doctor/security/no-auth-token-in-web-storage': 'warn',
  'vue-doctor/security/no-secrets-in-source': 'warn',
};

const NUXT_PLUGIN_RULES: Record<string, Severity> = {
  'nuxt-doctor/ai-slop/no-process-client-server': 'error',
  'nuxt-doctor/ai-slop/no-explicit-imports-of-auto-imported': 'warn',
  'nuxt-doctor/ai-slop/no-useState-for-server-data': 'warn',
  'nuxt-doctor/ai-slop/no-fetch-in-setup': 'warn',
  'nuxt-doctor/data-fetching/useAsyncData-key-required-in-loop': 'error',
  'nuxt-doctor/server-routes/defineEventHandler-typed': 'warn',
  'nuxt-doctor/server-routes/validate-body-with-h3-v2': 'warn',
  'nuxt-doctor/server-routes/createError-on-failure': 'warn',
  'nuxt-doctor/hydration/no-document-in-setup': 'error',
  'nuxt-doctor/hydration/clientOnly-for-browser-apis': 'error',
  'nuxt-doctor/security/no-user-input-in-fetch-url': 'warn',
};

// Only these ids are real oxlint-plugin/built-in rules. Other doctor rules run
// in separate passes; emitting their ids here makes oxlint exit non-zero
// ("rule not found"), silently killing the whole script pass — so the rules
// block is filtered to this allowlist.
const VUE_OXLINT_RULE_IDS: ReadonlySet<string> = new Set([
  'vue/no-export-in-script-setup',
  'vue/require-typed-ref',
  'vue/no-arrow-functions-in-watch',
  'vue/no-deprecated-data-object-declaration',
  'vue/no-deprecated-events-api',
  'vue/no-deprecated-destroyed-lifecycle',
  'vue/no-deprecated-model-definition',
  'vue/no-deprecated-delete-set',
  'vue/no-deprecated-vue-config-keycodes',
  'vue/no-lifecycle-after-await',
  'vue/no-this-in-before-route-enter',
  'vue/return-in-computed-property',
  'vue/valid-define-emits',
  'vue/valid-define-props',
  'vue/no-required-prop-with-default',
  'vue/prefer-import-from-vue',
  'vue/no-import-compiler-macros',
  'vue/no-multiple-slot-args',
  'vue/require-default-export',
  'vue/define-emits-declaration',
  'vue/define-props-declaration',
  'vue/define-props-destructuring',
  'vue/max-props',
  'vue-doctor/no-em-dash-in-string',
  'vue-doctor/no-destructure-props-without-to-refs',
  'vue-doctor/no-destructure-reactive-without-to-refs',
  'vue-doctor/no-non-null-assertion-on-ref-value',
  'vue-doctor/no-imports-from-vue-when-auto-imported',
  'vue-doctor/reactivity/watch-without-cleanup',
  'vue-doctor/reactivity/prefer-shallowRef-for-large-data',
  'vue-doctor/reactivity/prefer-readonly-for-injected',
  'vue-doctor/reactivity/no-fresh-deps-in-watch',
  'vue-doctor/composition/prefer-script-setup-for-new-files',
  'vue-doctor/composition/defineProps-typed',
  'vue-doctor/composition/no-pinia-store-in-setup',
  'vue-doctor/performance/prefer-defineAsyncComponent-on-route',
  'vue-doctor/performance/prefer-module-scope-static-value',
  'vue-doctor/performance/prefer-module-scope-pure-function',
  'vue-doctor/performance/prefer-stable-empty-fallback',
  'vue-doctor/security/no-inner-html',
  'vue-doctor/security/no-eval-like',
  'vue-doctor/security/no-auth-token-in-web-storage',
  'vue-doctor/security/no-secrets-in-source',
]);

const NUXT_OXLINT_RULE_IDS: ReadonlySet<string> = new Set(
  Object.keys(NUXT_PLUGIN_RULES),
);

function oxlintRuleAllowlist(framework: 'vue' | 'nuxt'): ReadonlySet<string> {
  if (framework !== 'nuxt') return VUE_OXLINT_RULE_IDS;
  return new Set([...VUE_OXLINT_RULE_IDS, ...NUXT_OXLINT_RULE_IDS]);
}

function toOxlintSeverity(s: Severity): 'error' | 'warn' {
  if (s === 'error') return 'error';
  return 'warn';
}

interface CacheTarget {
  dir: string;
  removeDir: boolean;
}

async function resolveCacheDir(
  rootDir: string | undefined,
): Promise<CacheTarget> {
  if (rootDir && existsSync(join(rootDir, 'node_modules'))) {
    const dir = join(rootDir, 'node_modules', '.cache', 'doctor');
    await mkdir(dir, { recursive: true });
    return { dir, removeDir: false };
  }
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-'));
  return { dir, removeDir: true };
}

function resolveUserConfig(rootDir: string | undefined): string | undefined {
  if (!rootDir) return undefined;
  for (const name of ['.oxlintrc.json', '.oxlintrc']) {
    const candidate = join(rootDir, name);
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

export async function generateOxlintConfig(
  input: GenerateConfigInput,
): Promise<GeneratedConfig> {
  const { dir, removeDir } = await resolveCacheDir(input.rootDir);
  const framework = input.framework === 'nuxt' ? 'nuxt' : 'vue';
  const allowlist = oxlintRuleAllowlist(framework);
  let defaults: Record<string, Severity> = { ...VUE_DEFAULT_RULES };
  if (framework === 'nuxt') {
    defaults = { ...defaults, ...NUXT_PLUGIN_RULES };
  }
  const merged: Record<string, Severity> = { ...defaults };
  if (input.ruleOverrides) {
    for (const [id, sev] of Object.entries(input.ruleOverrides)) {
      // Only oxlint-plugin rule ids belong in the oxlint config. Overrides for
      // rules handled by other doctor-core passes are ignored here (they are
      // applied in their own pass), preventing oxlint "rule not found" exits.
      if (!allowlist.has(id)) continue;
      if (sev === 'off') delete merged[id];
      else merged[id] = sev;
    }
  }
  const rules: Record<string, 'error' | 'warn'> = {};
  for (const [id, sev] of Object.entries(merged)) {
    rules[id] = toOxlintSeverity(sev);
  }
  const userConfig = resolveUserConfig(input.rootDir);
  const config = {
    $schema:
      'https://raw.githubusercontent.com/oxc-project/oxc/main/npm/oxlint/configuration_schema.json',
    ...(userConfig ? { extends: [userConfig] } : {}),
    plugins: ['vue'],
    jsPlugins: input.pluginPaths,
    ...(input.exclude && input.exclude.length > 0
      ? { ignorePatterns: input.exclude }
      : {}),
    rules,
  };
  const configPath = join(dir, '.oxlintrc.json');
  await writeFile(configPath, JSON.stringify(config, null, 2));
  const cleanup = async (): Promise<void> => {
    await rm(removeDir ? dir : configPath, { recursive: true, force: true });
  };
  return { configPath, cleanup };
}
