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
    const { configPath, cleanup } = await generateOxlintConfig({
      pluginPaths: ['/some/plugin.js'],
    });
    expect(configPath.endsWith('.oxlintrc.json')).toBe(true);
    const cfg = await readConfig(configPath);
    expect(cfg.plugins).toEqual(['vue']);
    expect(cfg.jsPlugins).toEqual(['/some/plugin.js']);
    expect(cfg.rules['vue/no-export-in-script-setup']).toBe('error');
    expect(cfg.rules['vue/require-typed-ref']).toBe('warn');
    expect(cfg.rules['vue-doctor/no-em-dash-in-string']).toBe('warn');
    await cleanup();
  });

  it('writes nuxt plugin rules in default rules when framework=nuxt', async () => {
    const { configPath, cleanup } = await generateOxlintConfig({
      pluginPaths: ['/nuxt-plugin.js', '/vue-plugin.js'],
      framework: 'nuxt',
    });
    const cfg = await readConfig(configPath);
    expect(cfg.jsPlugins).toEqual(['/nuxt-plugin.js', '/vue-plugin.js']);
    expect(cfg.rules['nuxt-doctor/ai-slop/no-process-client-server']).toBe(
      'error',
    );
    expect(cfg.rules['nuxt-doctor/hydration/no-document-in-setup']).toBe(
      'error',
    );
    expect(
      cfg.rules['nuxt-doctor/server-routes/defineEventHandler-typed'],
    ).toBe('warn');
    expect('nuxt-doctor/cloudflare/og-image-via-satori' in cfg.rules).toBe(
      false,
    );
    await cleanup();
  });

  it('applies severity overrides and maps warn to warn', async () => {
    const { configPath, cleanup } = await generateOxlintConfig({
      pluginPaths: ['/p.js'],
      ruleOverrides: {
        'vue/require-typed-ref': 'error',
        'vue/no-export-in-script-setup': 'warn',
      },
    });
    const cfg = await readConfig(configPath);
    expect(cfg.rules['vue/require-typed-ref']).toBe('error');
    expect(cfg.rules['vue/no-export-in-script-setup']).toBe('warn');
    await cleanup();
  });

  it('maps info severity to warn in oxlint config', async () => {
    const { configPath, cleanup } = await generateOxlintConfig({
      pluginPaths: ['/p.js'],
      ruleOverrides: {
        'vue/require-typed-ref': 'info',
      },
    });
    const cfg = await readConfig(configPath);
    expect(cfg.rules['vue/require-typed-ref']).toBe('warn');
    await cleanup();
  });

  it('removes an oxlint rule set to off and excludes non-oxlint override ids', async () => {
    const { configPath, cleanup } = await generateOxlintConfig({
      pluginPaths: ['/p.js'],
      ruleOverrides: {
        'vue/require-typed-ref': 'off',
        'vue-doctor/build-quality/vue-tsc-in-devDeps': 'error',
        'dead-code/unused-export': 'warn',
      },
    });
    const cfg = await readConfig(configPath);
    expect('vue/require-typed-ref' in cfg.rules).toBe(false);
    expect('vue-doctor/build-quality/vue-tsc-in-devDeps' in cfg.rules).toBe(
      false,
    );
    expect('dead-code/unused-export' in cfg.rules).toBe(false);
    await cleanup();
  });

  it('includes a nuxt oxlint-plugin override only when framework is nuxt', async () => {
    const off = await generateOxlintConfig({
      pluginPaths: ['/p.js'],
      ruleOverrides: { 'nuxt-doctor/hydration/no-document-in-setup': 'error' },
      framework: 'vue',
    });
    expect(
      'nuxt-doctor/hydration/no-document-in-setup' in
        (await readConfig(off.configPath)).rules,
    ).toBe(false);
    await off.cleanup();

    const on = await generateOxlintConfig({
      pluginPaths: ['/n.js', '/p.js'],
      ruleOverrides: { 'nuxt-doctor/hydration/no-document-in-setup': 'error' },
      framework: 'nuxt',
    });
    expect(
      (await readConfig(on.configPath)).rules[
        'nuxt-doctor/hydration/no-document-in-setup'
      ],
    ).toBe('error');
    await on.cleanup();
  });
});
