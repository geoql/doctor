import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkNuxtProject } from '../src/check-nuxt-project.js';
import type { ProjectInfo } from '../src/types/project-info.js';

async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-nuxt-orch-'));
  for (const [name, content] of Object.entries(files)) {
    const filePath = join(dir, name);
    await mkdir(join(dir, name.split('/').slice(0, -1).join('/') || '.'), {
      recursive: true,
    });
    await writeFile(filePath, content);
  }
  return dir;
}

function makeProject(
  rootDirectory: string,
  overrides: Partial<ProjectInfo> = {},
): ProjectInfo {
  return {
    framework: 'nuxt',
    rootDirectory,
    packageJsonPath: join(rootDirectory, 'package.json'),
    vueVersion: null,
    nuxtVersion: '4.4.0',
    typescriptVersion: '6.0.3',
    hasAutoImports: true,
    hasComponentsAutoImport: true,
    hasPinia: false,
    hasVueRouter: false,
    nitroPreset: null,
    nuxtCompatibilityVersion: 4,
    monorepoKind: null,
    nuxtConfigPath: null,
    hasAppDir: true,
    appDirPath: join(rootDirectory, 'app'),
    hasServerDir: false,
    hasPagesDir: false,
    hasWranglerConfig: false,
    capabilities: new Set(),
    ...overrides,
  };
}

describe('checkNuxtProject', () => {
  it('returns [] when packageJsonPath is null', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    const diags = await checkNuxtProject(
      makeProject(dir, { packageJsonPath: null }),
    );
    expect(diags).toEqual([]);
  });

  it('returns [] when the framework is not nuxt', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    const diags = await checkNuxtProject(
      makeProject(dir, { framework: 'vue' }),
    );
    expect(diags).toEqual([]);
  });

  it('aggregates diagnostics from multiple checks on a triggering fixture', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        dependencies: { '@nuxt/bridge': '^3.0.0' },
      }),
    });
    const diags = await checkNuxtProject(
      makeProject(dir, {
        hasAppDir: false,
        nuxtVersion: '4.2.0',
      }),
    );
    const ruleIds = diags.map((d) => d.ruleId);
    expect(ruleIds).toContain('nuxt-doctor/structure/uses-app-directory');
    expect(ruleIds).toContain('nuxt-doctor/structure/nuxt-major-current');
    expect(ruleIds).toContain(
      'nuxt-doctor/modules-deps/no-modules-incompatible-with-nuxt-4',
    );
    expect(ruleIds).toContain('nuxt-doctor/nitro/compatibilityDate-set');
    expect(ruleIds).toContain('nuxt-doctor/seo/lang-on-html');
    for (const d of diags) {
      expect(d.source).toBe('project');
    }
  });

  it('parses nuxt.config so config-driven checks pass when satisfied', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        dependencies: {
          nuxt: '^4.4.0',
          '@nuxt/image': '^1.0.0',
          '@nuxtjs/seo': '^2.0.0',
          '@nuxt/fonts': '^0.10.0',
        },
      }),
      'nuxt.config.ts': `export default defineNuxtConfig({
        compatibilityDate: '2025-01-01',
        app: { head: { htmlAttrs: { lang: 'en' } } },
      });`,
    });
    const diags = await checkNuxtProject(
      makeProject(dir, { nuxtConfigPath: join(dir, 'nuxt.config.ts') }),
    );
    const ruleIds = diags.map((d) => d.ruleId);
    expect(ruleIds).not.toContain('nuxt-doctor/nitro/compatibilityDate-set');
    expect(ruleIds).not.toContain('nuxt-doctor/seo/lang-on-html');
    expect(diags).toEqual([]);
  });

  it('surfaces cloudflare diagnostics when a wrangler config is present', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        dependencies: {
          nuxt: '^4.4.0',
          '@nuxt/image': '^1.0.0',
          '@nuxtjs/seo': '^2.0.0',
          '@nuxt/fonts': '^0.10.0',
          sharp: '^0.33.0',
        },
      }),
      'nuxt.config.ts': `export default defineNuxtConfig({
        compatibilityDate: '2025-01-01',
        nitro: { preset: 'node-server' },
        app: { head: { htmlAttrs: { lang: 'en' } } },
      });`,
    });
    const diags = await checkNuxtProject(
      makeProject(dir, {
        nuxtConfigPath: join(dir, 'nuxt.config.ts'),
        nitroPreset: 'node-server',
        hasWranglerConfig: true,
      }),
    );
    const ruleIds = diags.map((d) => d.ruleId);
    expect(ruleIds).toContain('nuxt-doctor/cloudflare/nitro-cloudflare-preset');
    expect(ruleIds).toContain('nuxt-doctor/cloudflare/og-image-via-satori');
    expect(ruleIds).toContain('nuxt-doctor/cloudflare/no-node-only-modules');
  });
});
