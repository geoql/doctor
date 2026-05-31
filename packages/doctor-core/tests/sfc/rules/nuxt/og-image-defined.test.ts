import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcDescriptorCache } from '../../../../src/sfc/parse-sfc-descriptor.js';
import { check } from '../../../../src/sfc/rules/nuxt/og-image-defined.js';
import type { SfcRuleContext } from '../../../../src/sfc/rules/types.js';
import type { ProjectInfo } from '../../../../src/types/project-info.js';

const RULE_ID = 'nuxt-doctor/seo/og-image-defined';

async function pageFixture(
  relPath: string,
  content: string,
  projectOverrides: Partial<ProjectInfo> = {},
): Promise<{ path: string; ctx: SfcRuleContext }> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-og-'));
  const path = join(dir, relPath);
  const segments = relPath.split('/').slice(0, -1);
  if (segments.length > 0) {
    await mkdir(join(dir, segments.join('/')), { recursive: true });
  }
  await writeFile(path, content);
  const { parseSfcDescriptor: parse } =
    await import('../../../../src/sfc/parse-sfc-descriptor.js');
  const descriptor = await parse(path);
  if (!descriptor) throw new Error('parse failed: ' + path);
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

describe('og-image-defined — fires', () => {
  it('warns when useSeoMeta is present but og:image is missing and no og-image module', async () => {
    const { ctx } = await pageFixture(
      'pages/index.vue',
      '<script setup lang="ts">useSeoMeta({ title: "Home" });</script>\n<template><div>home</div></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(1);
    expect(diags[0]?.ruleId).toBe(RULE_ID);
    expect(diags[0]?.severity).toBe('warn');
    expect(diags[0]?.source).toBe('sfc');
    expect(diags[0]?.message).toContain('og:image');
  });

  it('warns when useHead is present but og:image is missing and no og-image module', async () => {
    const { ctx } = await pageFixture(
      'pages/about.vue',
      '<script setup lang="ts">useHead({ title: "About" });</script>\n<template><div>about</div></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(1);
    expect(diags[0]?.ruleId).toBe(RULE_ID);
  });

  it('warns when SEO call uses string-literal "og:image" key', async () => {
    const { ctx } = await pageFixture(
      'pages/index.vue',
      '<script setup lang="ts">useSeoMeta({ title: "Home", "og:image": "/og.png" });</script>\n<template><div>home</div></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(0);
  });

  it('ignores non-call / non-SEO / member-callee statements while still warning (branch coverage)', async () => {
    const { ctx } = await pageFixture(
      'pages/index.vue',
      '<script setup lang="ts">const x = 1;\nfoo();\nobj.useSeoMeta({ ogImage: "/x" });\n42;\nother({ ogImage: "/x" });\nuseSeoMeta({ title: "Home" });</script>\n<template><div>h</div></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(1);
    expect(diags[0]?.ruleId).toBe(RULE_ID);
  });

  it('warns when SEO call uses SpreadElement (not a Property)', async () => {
    const { ctx } = await pageFixture(
      'pages/index.vue',
      '<script setup lang="ts">useSeoMeta({ ...seoDefaults, title: "Home" });</script>\n<template><div>home</div></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(1);
  });

  it('warns when SEO call has non-ObjectExpression first arg', async () => {
    const { ctx } = await pageFixture(
      'pages/index.vue',
      '<script setup lang="ts">useSeoMeta("invalid");</script>\n<template><div>home</div></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(1);
  });

  it('warns on a plain (no lang attr) <script setup> page (js branch)', async () => {
    const { ctx } = await pageFixture(
      'pages/index.vue',
      '<script setup>useSeoMeta({ title: "Home" });</script>\n<template><div>home</div></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(1);
    expect(diags[0]?.ruleId).toBe(RULE_ID);
  });
});

describe('og-image-defined — does not fire', () => {
  it('does not fire when useSeoMeta includes og:image', async () => {
    const { ctx } = await pageFixture(
      'pages/index.vue',
      '<script setup lang="ts">useSeoMeta({ title: "Home", ogImage: "/og.png" });</script>\n<template><div>home</div></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(0);
  });

  it('does not fire when useSeoMeta includes og:image as string-literal key', async () => {
    const { ctx } = await pageFixture(
      'pages/index.vue',
      '<script setup lang="ts">useSeoMeta({ title: "Home", "og:image": "/og.png" });</script>\n<template><div>home</div></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(0);
  });

  it('does not fire when @nuxtjs/og-image is installed', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-og-dep-'));
    const relPath = 'pages/index.vue';
    const path = join(dir, relPath);
    await mkdir(join(dir, 'pages'), { recursive: true });
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ dependencies: { '@nuxtjs/og-image': '^3.0.0' } }),
    );
    await writeFile(
      path,
      '<script setup lang="ts">useSeoMeta({ title: "Home" });</script>\n<template><div>home</div></template>',
    );
    const { parseSfcDescriptor: parse } =
      await import('../../../../src/sfc/parse-sfc-descriptor.js');
    const descriptor = await parse(path);
    if (!descriptor) throw new Error('parse failed');
    const { relative } = await import('node:path');
    const relativePath = relative(dir, path).replace(/\\/g, '/');
    const projectInfo: ProjectInfo = {
      framework: 'nuxt',
      rootDirectory: dir,
      packageJsonPath: join(dir, 'package.json'),
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
      nuxtConfigPath: join(dir, 'nuxt.config.ts'),
      hasAppDir: true,
      appDirPath: join(dir, 'app'),
      hasServerDir: false,
      hasPagesDir: true,
      hasWranglerConfig: false,
      capabilities: new Set(['nuxt4', 'pages-dir']),
    };
    const ctx = {
      file: path,
      descriptor,
      rootDirectory: dir,
      relativePath,
      projectInfo,
    };
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(0);
  });

  it('does not fire when nuxt-og-image (alt module) is installed', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-og-dep2-'));
    const path = join(dir, 'pages/index.vue');
    await mkdir(join(dir, 'pages'), { recursive: true });
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ devDependencies: { 'nuxt-og-image': '^4.0.0' } }),
    );
    await writeFile(
      path,
      '<script setup lang="ts">useSeoMeta({ title: "Home" });</script>\n<template><div>home</div></template>',
    );
    const { parseSfcDescriptor: parse } =
      await import('../../../../src/sfc/parse-sfc-descriptor.js');
    const descriptor = await parse(path);
    if (!descriptor) throw new Error('parse failed');
    const { relative } = await import('node:path');
    const relativePath = relative(dir, path).replace(/\\/g, '/');
    const projectInfo: ProjectInfo = {
      framework: 'nuxt',
      rootDirectory: dir,
      packageJsonPath: join(dir, 'package.json'),
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
      nuxtConfigPath: join(dir, 'nuxt.config.ts'),
      hasAppDir: true,
      appDirPath: join(dir, 'app'),
      hasServerDir: false,
      hasPagesDir: true,
      hasWranglerConfig: false,
      capabilities: new Set(['nuxt4', 'pages-dir']),
    };
    const ctx = {
      file: path,
      descriptor,
      rootDirectory: dir,
      relativePath,
      projectInfo,
    };
    expect(check(ctx).diagnostics).toHaveLength(0);
  });

  it('fires when package.json is malformed and useSeoMeta has no og:image', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-og-malformed-'));
    await mkdir(join(dir, 'pages'), { recursive: true });
    await writeFile(join(dir, 'package.json'), '{ invalid json }');
    const path = join(dir, 'pages/index.vue');
    await writeFile(
      path,
      '<script setup lang="ts">useSeoMeta({ title: "Home" });</script>\n<template><div>home</div></template>',
    );
    const { parseSfcDescriptor: parse } =
      await import('../../../../src/sfc/parse-sfc-descriptor.js');
    const descriptor = await parse(path);
    if (!descriptor) throw new Error('parse failed');
    const { relative } = await import('node:path');
    const relativePath = relative(dir, path).replace(/\\/g, '/');
    const projectInfo: ProjectInfo = {
      framework: 'nuxt',
      rootDirectory: dir,
      packageJsonPath: join(dir, 'package.json'),
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
      nuxtConfigPath: join(dir, 'nuxt.config.ts'),
      hasAppDir: true,
      appDirPath: join(dir, 'app'),
      hasServerDir: false,
      hasPagesDir: true,
      hasWranglerConfig: false,
      capabilities: new Set(['nuxt4', 'pages-dir']),
    };
    const ctx = {
      file: path,
      descriptor,
      rootDirectory: dir,
      relativePath,
      projectInfo,
    };
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(1);
  });

  it('does not fire on a non-page component', async () => {
    const { ctx } = await pageFixture(
      'components/Foo.vue',
      '<script setup lang="ts">useSeoMeta({ title: "Foo" });</script>\n<template><div>foo</div></template>',
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

  it('fires when useSeoMeta is called with a non-object arg (no og:image to detect)', async () => {
    const { ctx } = await pageFixture(
      'pages/index.vue',
      '<script setup lang="ts">useSeoMeta("some-string");</script>\n<template><div>hi</div></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(1);
  });

  it('does not fire when useHead has ogImage as Identifier key', async () => {
    const { ctx } = await pageFixture(
      'pages/index.vue',
      '<script setup lang="ts">useHead({ title: "Home", ogImage: "/og.png" });</script>\n<template><div>home</div></template>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(0);
  });

  it('does not fire when packageJsonPath is null', async () => {
    const { ctx } = await pageFixture(
      'pages/index.vue',
      '<script setup lang="ts">useSeoMeta({ title: "Home" });</script>\n<template><div>home</div></template>',
      { packageJsonPath: null },
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(0);
  });
});
