import { writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Severity } from '../types.js';

export interface GenerateConfigInput {
  pluginPath: string;
  ruleOverrides?: Record<string, Severity | 'off'>;
}

const DEFAULT_RULES: Record<string, Severity> = {
  'vue/no-export-in-script-setup': 'error',
  'vue/require-typed-ref': 'warn',
  'vue-doctor/no-em-dash-in-string': 'warn',
  'vue-doctor/no-destructure-props-without-to-refs': 'error',
  'vue-doctor/no-destructure-reactive-without-to-refs': 'error',
  'vue-doctor/no-non-null-assertion-on-ref-value': 'warn',
  'vue-doctor/no-imports-from-vue-when-auto-imported': 'warn',
};

function toOxlintSeverity(s: Severity): 'error' | 'warn' {
  if (s === 'error') return 'error';
  return 'warn';
}

export async function generateOxlintConfig(
  input: GenerateConfigInput,
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-'));
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
  const config = {
    $schema:
      'https://raw.githubusercontent.com/oxc-project/oxc/main/npm/oxlint/configuration_schema.json',
    plugins: ['vue'],
    jsPlugins: [input.pluginPath],
    rules,
  };
  const configPath = join(dir, '.oxlintrc.json');
  await writeFile(configPath, JSON.stringify(config, null, 2));
  return configPath;
}
