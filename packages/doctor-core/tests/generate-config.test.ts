import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { generateOxlintConfig } from '../src/oxlint/generate-config.js';

interface WrittenConfig {
  plugins: string[];
  jsPlugins: string[];
  rules: Record<string, 'error' | 'warn'>;
}

async function readConfig(path: string): Promise<WrittenConfig> {
  return JSON.parse(await readFile(path, 'utf8')) as WrittenConfig;
}

describe('generateOxlintConfig', () => {
  it('writes a config with default rules, vue plugin, and jsPlugin path', async () => {
    const path = await generateOxlintConfig({ pluginPath: '/some/plugin.js' });
    expect(path.endsWith('.oxlintrc.json')).toBe(true);
    const cfg = await readConfig(path);
    expect(cfg.plugins).toEqual(['vue']);
    expect(cfg.jsPlugins).toEqual(['/some/plugin.js']);
    expect(cfg.rules['vue/no-export-in-script-setup']).toBe('error');
    expect(cfg.rules['vue/require-typed-ref']).toBe('warn');
    expect(cfg.rules['vue-doctor/no-em-dash-in-string']).toBe('warn');
  });

  it('applies severity overrides and maps warn to warn', async () => {
    const path = await generateOxlintConfig({
      pluginPath: '/p.js',
      ruleOverrides: {
        'vue/require-typed-ref': 'error',
        'vue/no-export-in-script-setup': 'warn',
      },
    });
    const cfg = await readConfig(path);
    expect(cfg.rules['vue/require-typed-ref']).toBe('error');
    expect(cfg.rules['vue/no-export-in-script-setup']).toBe('warn');
  });

  it('maps info severity to warn in oxlint config', async () => {
    const path = await generateOxlintConfig({
      pluginPath: '/p.js',
      ruleOverrides: {
        'vue/require-typed-ref': 'info',
      },
    });
    const cfg = await readConfig(path);
    expect(cfg.rules['vue/require-typed-ref']).toBe('warn');
  });

  it('removes a rule set to off and adds a brand-new override rule', async () => {
    const path = await generateOxlintConfig({
      pluginPath: '/p.js',
      ruleOverrides: {
        'vue/require-typed-ref': 'off',
        'custom/new-rule': 'error',
      },
    });
    const cfg = await readConfig(path);
    expect('vue/require-typed-ref' in cfg.rules).toBe(false);
    expect(cfg.rules['custom/new-rule']).toBe('error');
  });
});
