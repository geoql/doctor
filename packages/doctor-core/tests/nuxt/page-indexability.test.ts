import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseSync } from 'oxc-parser';
import { describe, expect, it } from 'vite-plus/test';
import {
  isNonIndexablePage,
  pageRoutePath,
  routeMatches,
  scriptSetsNoindex,
} from '../../src/nuxt/page-indexability.js';
import { parseNoindexRoutePatterns } from '../../src/project-info/parse-nuxt-config.js';

function program(code: string) {
  return parseSync('page.ts', code, { sourceType: 'module', lang: 'ts' })
    .program;
}

async function project(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'geoql-doctor-indexable-'));
  for (const [rel, content] of Object.entries(files)) {
    const parts = rel.split('/').slice(0, -1);
    if (parts.length > 0)
      await mkdir(join(root, parts.join('/')), { recursive: true });
    await writeFile(join(root, rel), content);
  }
  return root;
}

describe('scriptSetsNoindex', () => {
  it.each([
    ["useSeoMeta({ robots: 'noindex, nofollow' })", true],
    ["useSeoMeta({ robots: 'none' })", true],
    ['useSeoMeta({ robots: { noindex: true } })', true],
    ["useSeoMeta({ 'robots': 'NOINDEX' })", true],
    ["useHead({ meta: [{ name: 'robots', content: 'noindex' }] })", true],
    ["useSeoMeta({ robots: 'index, follow' })", false],
    ['useSeoMeta({ robots: { noindex: false } })', false],
    ['useSeoMeta({ robots: { noindex: "yes" } })', false],
    ['useSeoMeta({ robots })', false],
    ["useSeoMeta({ ...base, [k]: 'noindex', 1: 'x' })", false],
    ['useSeoMeta(cfg)', false],
    ["useHead({ meta: [{ name: 'description', content: 'noindex' }] })", false],
    ["useHead({ meta: [{ name: 'robots', content: 'index' }] })", false],
    ["useHead({ meta: [{ name: 'robots', content: dyn }] })", false],
    ["useHead({ meta: [null, ...rest, 'x', { name: 'robots' }] })", false],
    ['useHead({ meta: metaList })', false],
    ["useHead({ robots: 'noindex' })", false],
    ["other({ robots: 'noindex' })", false],
    ["const a = 1; a.b({ robots: 'noindex' }); 2; useSeoMeta();", false],
  ])('%s → %s', (code, expected) => {
    expect(scriptSetsNoindex(program(code))).toBe(expected);
  });
});

describe('pageRoutePath', () => {
  it.each([
    ['app/pages/index.vue', '/'],
    ['pages/about.vue', '/about'],
    ['app/pages/admin/[id]/index.vue', '/admin/[id]'],
    ['app/pages/(marketing)/pricing.vue', '/pricing'],
    ['app\\pages\\docs\\intro.vue', '/docs/intro'],
  ])('%s → %s', (rel, route) => {
    expect(pageRoutePath(rel)).toBe(route);
  });
});

describe('routeMatches', () => {
  it.each([
    ['/**', '/anything', true],
    ['/admin/**', '/admin', true],
    ['/admin/**', '/admin/users', true],
    ['/admin/**', '/administrator', false],
    ['/embed/*', '/embed/[id]', true],
    ['/users/:id', '/users/[id]', true],
    ['/about', '/about', true],
    ['/about', '/about/team', false],
    ['/about', '/pricing', false],
  ])('%s vs %s → %s', (pattern, route, expected) => {
    expect(routeMatches(pattern, route)).toBe(expected);
  });
});

describe('parseNoindexRoutePatterns', () => {
  it('collects robots:false, noindex strings and X-Robots-Tag headers', () => {
    const source = `export default defineNuxtConfig({
      routeRules: {
        '/admin/**': { robots: false },
        '/embed/**': { robots: 'noindex' },
        '/api/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
        '/legacy': { headers: { 'x-robots-tag': 'none' } },
        '/public': { robots: true },
        '/cached': { swr: 60, headers: { 'cache-control': 'max-age=60' } },
        '/tag-index': { headers: { 'X-Robots-Tag': 'all' } },
        '/dyn': { headers: { 'X-Robots-Tag': tag } },
        '/hdr-ref': { headers: shared },
        '/hdr-ident': { headers: { robots: 'noindex', [k]: 'noindex', ...h } },
        '/rule-ref': shared,
        '/robots-str': { robots: 'index' },
        '/robots-num': { robots: 1 },
        [computed]: { robots: false },
        ...spread,
      },
    });`;
    expect(parseNoindexRoutePatterns(source)).toEqual([
      '/admin/**',
      '/embed/**',
      '/api/**',
      '/legacy',
    ]);
  });

  it('returns [] when there is no config object or no routeRules object', () => {
    expect(parseNoindexRoutePatterns('const x = 1;')).toEqual([]);
    expect(
      parseNoindexRoutePatterns('export default defineNuxtConfig({})'),
    ).toEqual([]);
    expect(
      parseNoindexRoutePatterns(
        'export default defineNuxtConfig({ routeRules: rules })',
      ),
    ).toEqual([]);
  });
});

describe('isNonIndexablePage', () => {
  it('is true for a page-level noindex', async () => {
    const root = await project({});
    expect(
      isNonIndexablePage({
        program: program("useSeoMeta({ robots: 'noindex' })"),
        relativePath: 'app/pages/a.vue',
        rootDirectory: root,
        nuxtConfigPath: null,
      }),
    ).toBe(true);
  });

  it.each([
    ["definePageMeta({ middleware: 'auth' })", true],
    ["definePageMeta({ middleware: ['log', 'require-auth'] })", true],
    ["definePageMeta({ middleware: 'sidebase-auth' })", true],
    ["definePageMeta({ middleware: 'Authenticated' })", true],
    ["definePageMeta({ middleware: 'guest-only' })", false],
    ["definePageMeta({ middleware: 'unauthorized' })", false],
    ['definePageMeta({ middleware: [fn, null, 3] })', false],
    ['definePageMeta({ middleware: fn })', false],
    ['definePageMeta(meta)', false],
  ])('auth middleware: %s → %s', async (code, expected) => {
    const root = await project({});
    expect(
      isNonIndexablePage({
        program: program(code),
        relativePath: 'app/pages/a.vue',
        rootDirectory: root,
        nuxtConfigPath: null,
      }),
    ).toBe(expected);
  });

  it('follows the named layout (Nuxt 4 app/ dir and root layout dir)', async () => {
    const layout =
      '<script setup lang="ts">useSeoMeta({ robots: \'noindex\' })</script><template><slot /></template>';
    const root = await project({
      'app/layouts/dash.vue': layout,
      'layouts/dash.vue': layout,
    });
    for (const relativePath of ['app/pages/x.vue', 'pages/x.vue']) {
      expect(
        isNonIndexablePage({
          program: program("definePageMeta({ layout: 'dash' })"),
          relativePath,
          rootDirectory: root,
          nuxtConfigPath: null,
        }),
      ).toBe(true);
    }
  });

  it('uses the default layout when definePageMeta names none', async () => {
    const root = await project({
      'app/layouts/default.vue':
        "<script setup>useHead({ meta: [{ name: 'robots', content: 'noindex' }] })</script><template><slot /></template>",
    });
    expect(
      isNonIndexablePage({
        program: program('const a = 1;'),
        relativePath: 'app/pages/x.vue',
        rootDirectory: root,
        nuxtConfigPath: null,
      }),
    ).toBe(true);
  });

  it('ignores the layout when layout: false, a missing layout, or a layout without script setup', async () => {
    const root = await project({
      'app/layouts/default.vue':
        "<script setup>useSeoMeta({ robots: 'noindex' })</script><template><slot /></template>",
      'app/layouts/plain.vue':
        '<script>export default {}</script><template><slot /></template>',
    });
    for (const code of [
      'definePageMeta({ layout: false })',
      "definePageMeta({ layout: 'missing' })",
      "definePageMeta({ layout: 'plain' })",
    ]) {
      expect(
        isNonIndexablePage({
          program: program(code),
          relativePath: 'app/pages/x.vue',
          rootDirectory: root,
          nuxtConfigPath: null,
        }),
      ).toBe(false);
    }
  });

  it('matches routeRules from nuxt.config and tolerates a missing config file', async () => {
    const root = await project({
      'nuxt.config.ts':
        "export default defineNuxtConfig({ routeRules: { '/admin/**': { robots: false } } })",
    });
    const base = {
      program: program('const a = 1;'),
      rootDirectory: root,
    };
    expect(
      isNonIndexablePage({
        ...base,
        relativePath: 'app/pages/admin/users.vue',
        nuxtConfigPath: join(root, 'nuxt.config.ts'),
      }),
    ).toBe(true);
    expect(
      isNonIndexablePage({
        ...base,
        relativePath: 'app/pages/pricing.vue',
        nuxtConfigPath: join(root, 'nuxt.config.ts'),
      }),
    ).toBe(false);
    expect(
      isNonIndexablePage({
        ...base,
        relativePath: 'app/pages/admin/users.vue',
        nuxtConfigPath: join(root, 'missing.config.ts'),
      }),
    ).toBe(false);
  });
});
