import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCrossFilePass } from '../../../src/nuxt/cross-file/run.js';
import type { ProjectInfo } from '../../../src/types/project-info.js';

const RULE_ID = 'nuxt-doctor/data-fetching/no-shared-key-across-pages';

describe('no-shared-key-across-pages — fires', () => {
  it('warns when the same key is used in useAsyncData across2 different page files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-cross-key-'));
    await mkdir(join(dir, 'pages'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    await writeFile(
      join(dir, 'pages/a.vue'),
      '<script setup lang="ts">useAsyncData("hero-data", () => $fetch("/api/hero"));</script>\n<template><div>a</div></template>',
    );
    await writeFile(
      join(dir, 'pages/b.vue'),
      '<script setup lang="ts">useAsyncData("hero-data", () => $fetch("/api/hero"));</script>\n<template><div>b</div></template>',
    );
    const files = [join(dir, 'pages/a.vue'), join(dir, 'pages/b.vue')];
    const projectInfo = makeProject(dir);
    const diags = await runCrossFilePass({ files, projectInfo });
    const relevant = diags.filter((d) => d.ruleId === RULE_ID);
    expect(relevant.length).toBeGreaterThanOrEqual(2);
    expect(relevant.every((d) => d.severity === 'warn')).toBe(true);
    expect(relevant.every((d) => d.ruleId === RULE_ID)).toBe(true);
  });

  it('warns when the same key is used in useFetch across2 different page files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-cross-key2-'));
    await mkdir(join(dir, 'pages'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    await writeFile(
      join(dir, 'pages/a.vue'),
      '<script setup lang="ts">useFetch("/api/x", { key: "user-stats" });</script>\n<template><div>a</div></template>',
    );
    await writeFile(
      join(dir, 'pages/b.vue'),
      '<script setup lang="ts">useFetch("/api/y", { key: "user-stats" });</script>\n<template><div>b</div></template>',
    );
    const files = [join(dir, 'pages/a.vue'), join(dir, 'pages/b.vue')];
    const projectInfo = makeProject(dir);
    const diags = await runCrossFilePass({ files, projectInfo });
    const relevant = diags.filter((d) => d.ruleId === RULE_ID);
    expect(relevant.length).toBeGreaterThanOrEqual(2);
  });

  it('warns for cross-key between useAsyncData in one page and useFetch in another', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-cross-key3-'));
    await mkdir(join(dir, 'pages'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    await writeFile(
      join(dir, 'pages/a.vue'),
      '<script setup lang="ts">useAsyncData("shared-key", () => $fetch("/x"));</script>\n<template><div>a</div></template>',
    );
    await writeFile(
      join(dir, 'pages/b.vue'),
      '<script setup lang="ts">useFetch("/api/y", { key: "shared-key" });</script>\n<template><div>b</div></template>',
    );
    const files = [join(dir, 'pages/a.vue'), join(dir, 'pages/b.vue')];
    const projectInfo = makeProject(dir);
    const diags = await runCrossFilePass({ files, projectInfo });
    const relevant = diags.filter((d) => d.ruleId === RULE_ID);
    expect(relevant.length).toBeGreaterThanOrEqual(2);
  });
});

describe('no-shared-key-across-pages — does not fire', () => {
  it('does not fire when each page uses a unique key', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-cross-unique-'));
    await mkdir(join(dir, 'pages'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    await writeFile(
      join(dir, 'pages/a.vue'),
      '<script setup lang="ts">useAsyncData("key-a", () => $fetch("/a"));</script>\n<template><div>a</div></template>',
    );
    await writeFile(
      join(dir, 'pages/b.vue'),
      '<script setup lang="ts">useAsyncData("key-b", () => $fetch("/b"));</script>\n<template><div>b</div></template>',
    );
    const files = [join(dir, 'pages/a.vue'), join(dir, 'pages/b.vue')];
    const projectInfo = makeProject(dir);
    const diags = await runCrossFilePass({ files, projectInfo });
    const relevant = diags.filter((d) => d.ruleId === RULE_ID);
    expect(relevant).toHaveLength(0);
  });

  it('detects shared key via template literal in useAsyncData', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-cross-tmpl-'));
    await mkdir(join(dir, 'pages'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    await writeFile(
      join(dir, 'pages/a.vue'),
      '<script setup lang="ts">useAsyncData(`hero-data`, () => $fetch("/api/hero"));</script>\n<template><div>a</div></template>',
    );
    await writeFile(
      join(dir, 'pages/b.vue'),
      '<script setup lang="ts">useAsyncData(`hero-data`, () => $fetch("/api/hero"));</script>\n<template><div>b</div></template>',
    );
    const files = [join(dir, 'pages/a.vue'), join(dir, 'pages/b.vue')];
    const projectInfo = makeProject(dir);
    const diags = await runCrossFilePass({ files, projectInfo });
    const relevant = diags.filter((d) => d.ruleId === RULE_ID);
    expect(relevant.length).toBeGreaterThanOrEqual(2);
  });

  it('does not fire when the same key is used in2 components (not pages)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-cross-comp-'));
    await mkdir(join(dir, 'components'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    await writeFile(
      join(dir, 'components/A.vue'),
      '<script setup lang="ts">useAsyncData("shared", () => $fetch("/x"));</script>\n<template><div>a</div></template>',
    );
    await writeFile(
      join(dir, 'components/B.vue'),
      '<script setup lang="ts">useAsyncData("shared", () => $fetch("/y"));</script>\n<template><div>b</div></template>',
    );
    const files = [
      join(dir, 'components/A.vue'),
      join(dir, 'components/B.vue'),
    ];
    const projectInfo = makeProject(dir);
    const diags = await runCrossFilePass({ files, projectInfo });
    const relevant = diags.filter((d) => d.ruleId === RULE_ID);
    expect(relevant).toHaveLength(0);
  });

  it('returns [] when framework is not nuxt', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-cross-vue-'));
    await mkdir(join(dir, 'pages'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    await writeFile(
      join(dir, 'pages/a.vue'),
      '<script setup lang="ts">useAsyncData("shared", () => $fetch("/x"));</script>\n<template><div>a</div></template>',
    );
    await writeFile(
      join(dir, 'pages/b.vue'),
      '<script setup lang="ts">useAsyncData("shared", () => $fetch("/y"));</script>\n<template><div>b</div></template>',
    );
    const files = [join(dir, 'pages/a.vue'), join(dir, 'pages/b.vue')];
    const projectInfo = makeProject(dir, { framework: 'vue' });
    const diags = await runCrossFilePass({ files, projectInfo });
    expect(diags).toHaveLength(0);
  });

  it('returns [] when there are no page files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-cross-nopages-'));
    await mkdir(join(dir, 'components'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    await writeFile(
      join(dir, 'components/A.vue'),
      '<script setup lang="ts">useAsyncData("shared", () => $fetch("/x"));</script>\n<template><div>a</div></template>',
    );
    const files = [join(dir, 'components/A.vue')];
    const projectInfo = makeProject(dir);
    const diags = await runCrossFilePass({ files, projectInfo });
    expect(diags).toHaveLength(0);
  });

  it('warns when key is a template literal shared across pages', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-cross-tmpl2-'));
    await mkdir(join(dir, 'pages'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    await writeFile(
      join(dir, 'pages/a.vue'),
      '<script setup lang="ts">useAsyncData(`user-profile`, () => $fetch("/api/user"));</script>\n<template><div>a</div></template>',
    );
    await writeFile(
      join(dir, 'pages/b.vue'),
      '<script setup lang="ts">useAsyncData(`user-profile`, () => $fetch("/api/user"));</script>\n<template><div>b</div></template>',
    );
    const files = [join(dir, 'pages/a.vue'), join(dir, 'pages/b.vue')];
    const projectInfo = makeProject(dir);
    const diags = await runCrossFilePass({ files, projectInfo });
    const relevant = diags.filter((d) => d.ruleId === RULE_ID);
    expect(relevant.length).toBeGreaterThanOrEqual(2);
  });

  it('warns when key is a non-literal expression (computed key)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-cross-nonlit-'));
    await mkdir(join(dir, 'pages'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    await writeFile(
      join(dir, 'pages/a.vue'),
      '<script setup lang="ts">const k = "shared-key"; useAsyncData(k, () => $fetch("/x"));</script>\n<template><div>a</div></template>',
    );
    await writeFile(
      join(dir, 'pages/b.vue'),
      '<script setup lang="ts">const k = "shared-key"; useAsyncData(k, () => $fetch("/y"));</script>\n<template><div>b</div></template>',
    );
    const files = [join(dir, 'pages/a.vue'), join(dir, 'pages/b.vue')];
    const projectInfo = makeProject(dir);
    const diags = await runCrossFilePass({ files, projectInfo });
    const relevant = diags.filter((d) => d.ruleId === RULE_ID);
    expect(relevant).toHaveLength(0);
  });

  it('warns when useFetch key option is shared across pages', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-cross-fetch-key-'));
    await mkdir(join(dir, 'pages'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    await writeFile(
      join(dir, 'pages/a.vue'),
      '<script setup lang="ts">useFetch("/api/a", { key: "fetch-key" });</script>\n<template><div>a</div></template>',
    );
    await writeFile(
      join(dir, 'pages/b.vue'),
      '<script setup lang="ts">useFetch("/api/b", { key: "fetch-key" });</script>\n<template><div>b</div></template>',
    );
    const files = [join(dir, 'pages/a.vue'), join(dir, 'pages/b.vue')];
    const projectInfo = makeProject(dir);
    const diags = await runCrossFilePass({ files, projectInfo });
    const relevant = diags.filter((d) => d.ruleId === RULE_ID);
    expect(relevant.length).toBeGreaterThanOrEqual(2);
  });
});

function makeProject(
  rootDir: string,
  overrides: Partial<ProjectInfo> = {},
): ProjectInfo {
  return {
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
    ...overrides,
  };
}
