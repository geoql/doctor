import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseNuxtConfig } from '../src/project-info/parse-nuxt-config.js';

async function tmp(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'geoql-doctor-nuxtcfg-'));
}

describe('parseNuxtConfig', () => {
  it('returns null when no config file exists', async () => {
    const dir = await tmp();
    expect(await parseNuxtConfig(dir)).toBeNull();
  });

  it('extracts values from a defineNuxtConfig call', async () => {
    const dir = await tmp();
    await writeFile(
      join(dir, 'nuxt.config.ts'),
      `export default defineNuxtConfig({
        compatibilityVersion: 4,
        nitro: { preset: 'cloudflare-pages' },
        modules: ['@pinia/nuxt', 42, ident, '@nuxtjs/seo'],
        imports: { autoImport: false },
      });`,
    );
    expect(await parseNuxtConfig(dir)).toEqual({
      compatibilityVersion: 4,
      nitroPreset: 'cloudflare-pages',
      modules: ['@pinia/nuxt', '@nuxtjs/seo'],
      importsAutoImport: false,
    });
  });

  it('extracts values from a plain default-exported object', async () => {
    const dir = await tmp();
    await writeFile(
      join(dir, 'nuxt.config.ts'),
      `export default { nitro: { preset: 'node-server' }, imports: { autoImport: true } };`,
    );
    expect(await parseNuxtConfig(dir)).toEqual({
      nitroPreset: 'node-server',
      importsAutoImport: true,
    });
  });

  it('prefers nuxt.config.js when no .ts is present', async () => {
    const dir = await tmp();
    await writeFile(
      join(dir, 'nuxt.config.js'),
      `export default defineNuxtConfig({ compatibilityVersion: 3 });`,
    );
    expect(await parseNuxtConfig(dir)).toEqual({ compatibilityVersion: 3 });
  });

  it('reads nuxt.config.mjs as the last fallback', async () => {
    const dir = await tmp();
    await writeFile(
      join(dir, 'nuxt.config.mjs'),
      `export default defineNuxtConfig({ nitro: { preset: 'vercel' } });`,
    );
    expect(await parseNuxtConfig(dir)).toEqual({ nitroPreset: 'vercel' });
  });

  it('returns an empty object for a config with no default export', async () => {
    const dir = await tmp();
    await writeFile(
      join(dir, 'nuxt.config.ts'),
      `export const x = defineNuxtConfig({ compatibilityVersion: 4 });`,
    );
    expect(await parseNuxtConfig(dir)).toEqual({});
  });

  it('returns an empty object when defineNuxtConfig is called without arguments', async () => {
    const dir = await tmp();
    await writeFile(
      join(dir, 'nuxt.config.ts'),
      `export default defineNuxtConfig();`,
    );
    expect(await parseNuxtConfig(dir)).toEqual({});
  });

  it('returns an empty object when the default export is a non-config call', async () => {
    const dir = await tmp();
    await writeFile(
      join(dir, 'nuxt.config.ts'),
      `export default wrap({ compatibilityVersion: 4 });`,
    );
    expect(await parseNuxtConfig(dir)).toEqual({});
  });

  it('returns an empty object when the default export call is a member expression', async () => {
    const dir = await tmp();
    await writeFile(
      join(dir, 'nuxt.config.ts'),
      `export default wrapper.build({ compatibilityVersion: 4 });`,
    );
    expect(await parseNuxtConfig(dir)).toEqual({});
  });

  it('skips array holes when collecting modules', async () => {
    const dir = await tmp();
    await writeFile(
      join(dir, 'nuxt.config.ts'),
      `export default defineNuxtConfig({ modules: ['@pinia/nuxt', , '@nuxtjs/seo'] });`,
    );
    expect(await parseNuxtConfig(dir)).toEqual({
      modules: ['@pinia/nuxt', '@nuxtjs/seo'],
    });
  });

  it('returns an empty object when the default export is a non-object literal', async () => {
    const dir = await tmp();
    await writeFile(join(dir, 'nuxt.config.ts'), `export default 42;`);
    expect(await parseNuxtConfig(dir)).toEqual({});
  });

  it('skips non-statically-resolvable and unknown keys', async () => {
    const dir = await tmp();
    await writeFile(
      join(dir, 'nuxt.config.ts'),
      `const preset = 'node-server';
      export default defineNuxtConfig({
        compatibilityVersion: someVar,
        nitro: { preset },
        ssr: true,
        ...spread,
        ['computed']: 1,
      });`,
    );
    expect(await parseNuxtConfig(dir)).toEqual({});
  });

  it('handles malformed config source without throwing', async () => {
    const dir = await tmp();
    await writeFile(
      join(dir, 'nuxt.config.ts'),
      `export default defineNuxtConfig({ broken: `,
    );
    expect(await parseNuxtConfig(dir)).toEqual({});
  });

  it('ignores non-string nitro preset and non-array modules', async () => {
    const dir = await tmp();
    await writeFile(
      join(dir, 'nuxt.config.ts'),
      `export default defineNuxtConfig({
        compatibilityVersion: '4',
        nitro: { preset: 123 },
        modules: 'not-an-array',
        imports: { autoImport: 'yes' },
      });`,
    );
    expect(await parseNuxtConfig(dir)).toEqual({});
  });

  it('ignores nested objects that omit the relevant key', async () => {
    const dir = await tmp();
    await writeFile(
      join(dir, 'nuxt.config.ts'),
      `export default defineNuxtConfig({
        nitro: { compressPublicAssets: true },
        imports: { dirs: ['stores'] },
      });`,
    );
    expect(await parseNuxtConfig(dir)).toEqual({});
  });

  it('ignores a nitro value that is not an object', async () => {
    const dir = await tmp();
    await writeFile(
      join(dir, 'nuxt.config.ts'),
      `export default defineNuxtConfig({ nitro: 'node-server', imports: true });`,
    );
    expect(await parseNuxtConfig(dir)).toEqual({});
  });
});
