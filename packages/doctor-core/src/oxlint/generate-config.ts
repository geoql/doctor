import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Severity } from '../types.js';

export interface GenerateConfigInput {
  pluginPath: string;
  ruleOverrides?: Record<string, Severity | 'off'>;
  rootDir?: string;
}

export interface GeneratedConfig {
  configPath: string;
  cleanup: () => Promise<void>;
}

const DEFAULT_RULES: Record<string, Severity> = {
  'vue/no-export-in-script-setup': 'error',
  'vue/require-typed-ref': 'warn',
  'vue-doctor/no-em-dash-in-string': 'warn',
  'vue-doctor/no-destructure-props-without-to-refs': 'error',
  'vue-doctor/no-destructure-reactive-without-to-refs': 'error',
  'vue-doctor/no-non-null-assertion-on-ref-value': 'warn',
  'vue-doctor/no-imports-from-vue-when-auto-imported': 'warn',
  'vue-doctor/reactivity/watch-without-cleanup': 'warn',
  'vue-doctor/composition/prefer-script-setup-for-new-files': 'warn',
  'vue-doctor/composition/defineProps-typed': 'warn',
};

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
  const merged: Record<string, Severity> = { ...DEFAULT_RULES };
  if (input.ruleOverrides) {
    for (const [id, sev] of Object.entries(input.ruleOverrides)) {
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
    jsPlugins: [input.pluginPath],
    rules,
  };
  const configPath = join(dir, '.oxlintrc.json');
  await writeFile(configPath, JSON.stringify(config, null, 2));
  const cleanup = async (): Promise<void> => {
    await rm(removeDir ? dir : configPath, { recursive: true, force: true });
  };
  return { configPath, cleanup };
}
