import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectProject } from '../src/detect-project.js';

async function tmp(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'geoql-doctor-detect-'));
}

async function scaffold(files: Record<string, string>): Promise<string> {
  const dir = await tmp();
  for (const [name, content] of Object.entries(files)) {
    const target = join(dir, name);
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, content);
  }
  return dir;
}

function caps(set: ReadonlySet<string>): string[] {
  return [...set].sort();
}

describe('detectProject', () => {
  it('detects a minimal Vue 3.4 project with typescript via tsconfig', async () => {
    const dir = await scaffold({
      'package.json': JSON.stringify({ dependencies: { vue: '^3.4.0' } }),
      'tsconfig.json': '{}',
    });
    const info = await detectProject(dir);
    expect(info.framework).toBe('vue');
    expect(info.rootDirectory).toBe(dir);
    expect(info.packageJsonPath).toBe(join(dir, 'package.json'));
    expect(info.vueVersion).toBe('3.4.0');
    expect(info.nuxtVersion).toBeNull();
    expect(info.typescriptVersion).toBeNull();
    expect(info.nuxtCompatibilityVersion).toBeNull();
    expect(info.hasPinia).toBe(false);
    expect(info.hasVueRouter).toBe(false);
    expect(caps(info.capabilities)).toEqual(['typescript', 'vue:3', 'vue:3.4']);
  });

  it('detects a Vue 3.5 project with unplugin auto-imports, pinia and router', async () => {
    const dir = await scaffold({
      'package.json': JSON.stringify({
        dependencies: {
          vue: '^3.5.0',
          'unplugin-auto-import': '^0.18.0',
          'unplugin-vue-components': '^0.27.0',
          pinia: '^2.2.0',
          'vue-router': '^4.4.0',
        },
      }),
    });
    const info = await detectProject(dir);
    expect(info.framework).toBe('vue');
    expect(info.hasAutoImports).toBe(true);
    expect(info.hasComponentsAutoImport).toBe(true);
    expect(info.hasPinia).toBe(true);
    expect(info.hasVueRouter).toBe(true);
    expect(caps(info.capabilities)).toEqual([
      'auto-imports:vue',
      'components:auto',
      'pinia',
      'vue-router',
      'vue:3',
      'vue:3.4',
      'vue:3.5',
    ]);
  });

  it('detects a Nuxt 4 project deployed to Cloudflare Pages', async () => {
    const dir = await scaffold({
      'package.json': JSON.stringify({
        dependencies: {
          nuxt: '^4.0.0',
          pinia: '^2.2.0',
          'vue-router': '^4.4.0',
        },
      }),
      'nuxt.config.ts': `export default defineNuxtConfig({
        compatibilityVersion: 4,
        nitro: { preset: 'cloudflare-pages' },
      });`,
      'wrangler.toml': 'name = "app"\n',
    });
    const info = await detectProject(dir);
    expect(info.framework).toBe('nuxt');
    expect(info.nuxtVersion).toBe('4.0.0');
    expect(info.nuxtCompatibilityVersion).toBe(4);
    expect(info.nitroPreset).toBe('cloudflare-pages');
    expect(info.hasVueRouter).toBe(false);
    expect(caps(info.capabilities)).toEqual([
      'auto-imports:vue',
      'cf-pages:enabled',
      'components:auto',
      'nuxt:4',
      'pinia',
    ]);
  });

  it('detects a Nuxt 4.4 project on a node server', async () => {
    const dir = await scaffold({
      'package.json': JSON.stringify({ devDependencies: { nuxt: '^4.4.0' } }),
      'nuxt.config.ts': `export default defineNuxtConfig({ nitro: { preset: 'node-server' } });`,
    });
    const info = await detectProject(dir);
    expect(info.framework).toBe('nuxt');
    expect(info.nitroPreset).toBe('node-server');
    expect(info.nuxtCompatibilityVersion).toBe(4);
    expect(caps(info.capabilities)).toEqual([
      'auto-imports:vue',
      'components:auto',
      'nitro:node-server',
      'nuxt:4',
      'nuxt:4.4',
    ]);
  });

  it('honors compatibilityVersion 4 even when nuxt is declared as v3', async () => {
    const dir = await scaffold({
      'package.json': JSON.stringify({ dependencies: { nuxt: '^3.13.0' } }),
      'nuxt.config.ts': `export default defineNuxtConfig({ compatibilityVersion: 4 });`,
    });
    const info = await detectProject(dir);
    expect(info.nuxtVersion).toBe('3.13.0');
    expect(info.nuxtCompatibilityVersion).toBe(4);
    expect(info.capabilities.has('nuxt:4')).toBe(true);
    expect(info.capabilities.has('nuxt:4.4')).toBe(false);
  });

  it('reports compatibilityVersion 3 from the nuxt config', async () => {
    const dir = await scaffold({
      'package.json': JSON.stringify({ dependencies: { nuxt: '^3.13.0' } }),
      'nuxt.config.ts': `export default defineNuxtConfig({ compatibilityVersion: 3 });`,
    });
    const info = await detectProject(dir);
    expect(info.nuxtCompatibilityVersion).toBe(3);
    expect(info.capabilities.has('nuxt:4')).toBe(false);
  });

  it('treats a Nuxt 3 project without a config as compatibility null', async () => {
    const dir = await scaffold({
      'package.json': JSON.stringify({ dependencies: { nuxt: '^3.13.0' } }),
    });
    const info = await detectProject(dir);
    expect(info.framework).toBe('nuxt');
    expect(info.nuxtVersion).toBe('3.13.0');
    expect(info.nuxtCompatibilityVersion).toBeNull();
    expect(info.nitroPreset).toBeNull();
    expect(info.capabilities.has('nuxt:4')).toBe(false);
    expect(caps(info.capabilities)).toEqual([
      'auto-imports:vue',
      'components:auto',
    ]);
  });

  it('disables auto-imports for Nuxt when imports.autoImport is false', async () => {
    const dir = await scaffold({
      'package.json': JSON.stringify({ dependencies: { nuxt: '^4.0.0' } }),
      'nuxt.config.ts': `export default defineNuxtConfig({ imports: { autoImport: false } });`,
    });
    const info = await detectProject(dir);
    expect(info.hasAutoImports).toBe(false);
    expect(info.capabilities.has('auto-imports:vue')).toBe(false);
    expect(info.capabilities.has('components:auto')).toBe(true);
  });

  it('detects cloudflare pages from wrangler.jsonc in a plain Vue project', async () => {
    const dir = await scaffold({
      'package.json': JSON.stringify({ dependencies: { vue: '^3.5.0' } }),
      'wrangler.jsonc': '{}',
    });
    const info = await detectProject(dir);
    expect(info.capabilities.has('cf-pages:enabled')).toBe(true);
  });

  it('detects cloudflare pages from the nitro preset without wrangler files', async () => {
    const dir = await scaffold({
      'package.json': JSON.stringify({ dependencies: { nuxt: '^4.0.0' } }),
      'nuxt.config.ts': `export default defineNuxtConfig({ nitro: { preset: 'cloudflare-pages' } });`,
    });
    const info = await detectProject(dir);
    expect(info.nitroPreset).toBe('cloudflare-pages');
    expect(info.capabilities.has('cf-pages:enabled')).toBe(true);
  });

  it('emits a typescript:6 capability for a TypeScript 6 dependency', async () => {
    const dir = await scaffold({
      'package.json': JSON.stringify({
        dependencies: { vue: '^3.5.0' },
        devDependencies: { typescript: '^6.0.3' },
      }),
    });
    const info = await detectProject(dir);
    expect(info.typescriptVersion).toBe('6.0.3');
    expect(info.capabilities.has('typescript')).toBe(true);
    expect(info.capabilities.has('typescript:6')).toBe(true);
  });

  it('omits typescript:6 for a TypeScript 5 dependency', async () => {
    const dir = await scaffold({
      'package.json': JSON.stringify({
        dependencies: { vue: '^3.5.0' },
        devDependencies: { typescript: '^5.4.0' },
      }),
    });
    const info = await detectProject(dir);
    expect(info.typescriptVersion).toBe('5.4.0');
    expect(info.capabilities.has('typescript')).toBe(true);
    expect(info.capabilities.has('typescript:6')).toBe(false);
  });

  it('detects a pnpm monorepo and keeps the nested app as the root directory', async () => {
    const repo = await tmp();
    await writeFile(
      join(repo, 'pnpm-workspace.yaml'),
      'packages:\n  - apps/*\n',
    );
    const web = join(repo, 'apps', 'web');
    await mkdir(web, { recursive: true });
    await writeFile(
      join(web, 'package.json'),
      JSON.stringify({ dependencies: { nuxt: '^4.0.0' } }),
    );
    const info = await detectProject(web);
    expect(info.rootDirectory).toBe(web);
    expect(info.monorepoKind).toBe('pnpm');
    expect(info.capabilities.has('monorepo:pnpm')).toBe(true);
  });

  it('emits monorepo:yarn and monorepo:npm tokens by kind', async () => {
    const yarnRepo = await tmp();
    await writeFile(
      join(yarnRepo, 'package.json'),
      JSON.stringify({ workspaces: ['p/*'], dependencies: { vue: '^3.5.0' } }),
    );
    await writeFile(join(yarnRepo, 'yarn.lock'), '');
    const yarnInfo = await detectProject(yarnRepo);
    expect(yarnInfo.monorepoKind).toBe('yarn');
    expect(yarnInfo.capabilities.has('monorepo:yarn')).toBe(true);

    const npmRepo = await tmp();
    await writeFile(
      join(npmRepo, 'package.json'),
      JSON.stringify({ workspaces: ['p/*'], dependencies: { vue: '^3.5.0' } }),
    );
    await writeFile(join(npmRepo, 'package-lock.json'), '{}');
    const npmInfo = await detectProject(npmRepo);
    expect(npmInfo.monorepoKind).toBe('npm');
    expect(npmInfo.capabilities.has('monorepo:npm')).toBe(true);
  });

  it('sets monorepoKind turbo without emitting a monorepo capability', async () => {
    const repo = await tmp();
    await writeFile(join(repo, 'turbo.json'), '{}');
    await writeFile(
      join(repo, 'package.json'),
      JSON.stringify({ dependencies: { vue: '^3.5.0' } }),
    );
    const info = await detectProject(repo);
    expect(info.monorepoKind).toBe('turbo');
    expect([...info.capabilities].some((c) => c.startsWith('monorepo:'))).toBe(
      false,
    );
  });

  it('returns an unknown framework with no capabilities for a non-Vue project', async () => {
    const dir = await scaffold({
      'package.json': JSON.stringify({ dependencies: { express: '^4.19.0' } }),
      'tsconfig.json': '{}',
    });
    const info = await detectProject(dir);
    expect(info.framework).toBe('unknown');
    expect(info.packageJsonPath).toBe(join(dir, 'package.json'));
    expect(caps(info.capabilities)).toEqual([]);
  });

  it('returns best-effort info with a null packageJsonPath when no package.json exists', async () => {
    const dir = await tmp();
    const info = await detectProject(dir);
    expect(info.framework).toBe('unknown');
    expect(info.packageJsonPath).toBeNull();
    expect(info.vueVersion).toBeNull();
    expect(caps(info.capabilities)).toEqual([]);
  });

  it('skips version-pinned vue capabilities when the range is uncoercible', async () => {
    const dir = await scaffold({
      'package.json': JSON.stringify({ dependencies: { vue: 'workspace:*' } }),
    });
    const info = await detectProject(dir);
    expect(info.framework).toBe('vue');
    expect(info.vueVersion).toBeNull();
    expect(caps(info.capabilities)).toEqual([]);
  });

  it('emits vue:3 but not vue:3.4 for an early Vue 3.3 project', async () => {
    const dir = await scaffold({
      'package.json': JSON.stringify({ dependencies: { vue: '^3.3.0' } }),
      'tsconfig.json': '{}',
    });
    const info = await detectProject(dir);
    expect(info.typescriptVersion).toBeNull();
    expect(info.capabilities.has('typescript')).toBe(true);
    expect(info.capabilities.has('vue:3')).toBe(true);
    expect(info.capabilities.has('vue:3.4')).toBe(false);
  });

  it('emits no vue capabilities for a Vue 2 project', async () => {
    const dir = await scaffold({
      'package.json': JSON.stringify({ dependencies: { vue: '^2.7.0' } }),
    });
    const info = await detectProject(dir);
    expect(info.framework).toBe('vue');
    expect(info.vueVersion).toBe('2.7.0');
    expect(caps(info.capabilities)).toEqual([]);
  });
});
