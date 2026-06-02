import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcDescriptorCache } from '../../../../src/sfc/parse-sfc-descriptor.js';
import { check } from '../../../../src/sfc/rules/nuxt/use-seo-meta-on-public-page.js';
import type { SfcRuleContext } from '../../../../src/sfc/rules/types.js';
import type { ProjectInfo } from '../../../../src/types/project-info.js';

const RULE_ID = 'nuxt-doctor/seo/useSeoMeta-on-public-page';

async function pageFixture(
  relPath: string,
  content: string,
  projectOverrides: Partial<ProjectInfo> = {},
): Promise<{ path: string; ctx: SfcRuleContext }> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-seo-'));
  const path = join(dir, relPath);
  const segments = relPath.split('/').slice(0, -1);
  if (segments.length > 0) {
    await mkdir(join(dir, segments.join('/')), { recursive: true });
  }
  await writeFile(path, content);
  const { parseSfcDescriptor: parse } =
    await import('../../../../src/sfc/parse-sfc-descriptor.js');
  const descriptor = await parse(path);
  if (!descriptor) throw new Error('parse failed for ' + path);
  const rootDir = dir;
  const { relative } = await import('node:path');
  const relativePath = relative(rootDir, path).replace(/\\/g, '/');
  const projectInfo: ProjectInfo = {
    framework: 'nuxt',
    rootDirectory: rootDir,
    packageJsonPath: join(rootDir, 'package.json'),
    vueVersion: '3.5.0',
    nuxtVersion: '4.4.0',
    typescriptVersion: '6.0.3',
    hasAutoImports: true,
    hasComponentsAutoImport: true,
    hasPinia: false,
    hasVueRouter: true,
    nitroPreset: null,
    nuxtCompatibilityVersion: 4,
    monorepoKind: null,
    nuxtConfigPath: join(rootDir, 'nuxt.config.ts'),
    hasAppDir: true,
    appDirPath: join(rootDir, 'app'),
    hasServerDir: false,
    hasPagesDir: true,
    hasWranglerConfig: false,
    capabilities: new Set(['nuxt4', 'pages-dir']),
    ...projectOverrides,
  };
  return {
    path,
    ctx: {
      file: path,
      descriptor,
      rootDirectory: rootDir,
      relativePath,
      projectInfo,
    },
  };
}

beforeEach(() => {
  clearSfcDescriptorCache();
});

describe('useSeoMeta-on-public-page — fires', () => {
  it('warns on a page file without useSeoMeta / useHead / definePageMeta', async () => {
    const { ctx } = await pageFixture(
      'pages/index.vue',
      '<script setup lang="ts">const x = 1;</script>\n<template><div>{{ x }}</div></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(1);
    expect(diags[0]?.ruleId).toBe(RULE_ID);
    expect(diags[0]?.severity).toBe('warn');
    expect(diags[0]?.source).toBe('sfc');
    expect(diags[0]?.message).toContain('SEO');
  });

  it('warns on an app/pages page without useSeoMeta', async () => {
    const { ctx } = await pageFixture(
      'app/pages/users/[id].vue',
      '<script setup>const id = 1;</script>\n<template><div>{{ id }}</div></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(1);
    expect(diags[0]?.ruleId).toBe(RULE_ID);
  });

  it('warns on a page with useHead but no title key', async () => {
    const { ctx } = await pageFixture(
      'pages/about.vue',
      '<script setup lang="ts">useHead({ description: "about" });</script>\n<template><div>about</div></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(1);
    expect(diags[0]?.ruleId).toBe(RULE_ID);
  });

  it('still warns past non-call / non-identifier-callee statements (branch coverage)', async () => {
    const { ctx } = await pageFixture(
      'pages/index.vue',
      '<script setup lang="ts">42;\nobj.method();\nconst y = 2;</script>\n<template><div>{{ y }}</div></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(1);
    expect(diags[0]?.ruleId).toBe(RULE_ID);
  });
});

describe('useSeoMeta-on-public-page — does not fire', () => {
  it('does not fire on a page with useSeoMeta and a title', async () => {
    const { ctx } = await pageFixture(
      'pages/index.vue',
      '<script setup lang="ts">useSeoMeta({ title: "Home" });</script>\n<template><div>home</div></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(0);
  });

  it('does not fire on a page with useHead and a title', async () => {
    const { ctx } = await pageFixture(
      'pages/about.vue',
      '<script setup lang="ts">useHead({ title: "About", description: "about" });</script>\n<template><div>about</div></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(0);
  });

  it('does not fire on a page with useSeoMeta using string-literal "title" key', async () => {
    const { ctx } = await pageFixture(
      'pages/index.vue',
      '<script setup lang="ts">useSeoMeta({ "title": "Home" });</script>\n<template><div>home</div></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(0);
  });

  it('does not fire on a page with definePageMeta and a title', async () => {
    const { ctx } = await pageFixture(
      'pages/about.vue',
      '<script setup lang="ts">definePageMeta({ title: "About" });</script>\n<template><div>about</div></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(0);
  });

  it('does not fire on a non-page component', async () => {
    const { ctx } = await pageFixture(
      'components/Foo.vue',
      '<script setup lang="ts">const x = 1;</script>\n<template><div>{{ x }}</div></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(0);
  });

  it('does not fire on a layout file', async () => {
    const { ctx } = await pageFixture(
      'layouts/default.vue',
      '<script setup lang="ts">const x = 1;</script>\n<template><slot /></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(0);
  });

  it('does not fire when scriptSetup is absent', async () => {
    const { ctx } = await pageFixture(
      'pages/index.vue',
      '<script>export default {}</script>\n<template><div>hi</div></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(0);
  });

  it('fires when useSeoMeta is called with no arguments', async () => {
    const { ctx } = await pageFixture(
      'pages/index.vue',
      '<script setup lang="ts">useSeoMeta();</script>\n<template><div>home</div></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(1);
  });

  it('fires when useSeoMeta is called with a string argument', async () => {
    const { ctx } = await pageFixture(
      'pages/index.vue',
      '<script setup lang="ts">useSeoMeta("not an object");</script>\n<template><div>home</div></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(1);
  });

  it('does not fire when SEO call uses a MemberExpression callee', async () => {
    const { ctx } = await pageFixture(
      'pages/index.vue',
      '<script setup lang="ts">const seo = { title: "Home" }; seoFn(seo);</script>\n<template><div>home</div></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(1);
  });

  it('does not fire when SEO call is a non-SeoMeta function', async () => {
    const { ctx } = await pageFixture(
      'pages/index.vue',
      '<script setup lang="ts">useAnalytics({ title: "Home" });</script>\n<template><div>home</div></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(1);
  });

  it('does not fire when useSeoMeta has a spread prop', async () => {
    const { ctx } = await pageFixture(
      'pages/index.vue',
      '<script setup lang="ts">useSeoMeta({ ...props, title: "Home" });</script>\n<template><div>home</div></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(0);
  });
});
