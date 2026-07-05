import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCrossFilePass } from '../../../src/nuxt/cross-file/run.js';
import type { ProjectInfo } from '../../../src/types/project-info.js';

const RULE_ID = 'nuxt-doctor/data-fetching/ssr-safe-onMounted-only-for-client';

function makeProject(
  rootDir: string,
  overrides: Partial<ProjectInfo> = {},
): ProjectInfo {
  return {
    framework: 'nuxt',
    frameworkDetected: true,
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

describe('ssr-safe-onMounted-only-for-client — fires', () => {
  it('warns when window is accessed at setup top-level outside onMounted', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-ssr-win-'));
    await mkdir(join(dir, 'pages'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    await writeFile(
      join(dir, 'pages/index.vue'),
      '<script setup lang="ts">const w = window.innerWidth;</script>\n<template><div>{{ w }}</div></template>',
    );
    const files = [join(dir, 'pages/index.vue')];
    const projectInfo = makeProject(dir);
    const diags = await runCrossFilePass({ files, projectInfo });
    const relevant = diags.filter((d) => d.ruleId === RULE_ID);
    expect(relevant.length).toBeGreaterThanOrEqual(1);
    expect(relevant[0]?.severity).toBe('warn');
    expect(relevant[0]?.source).toBe('cross-file');
  });

  it('warns when document is accessed at setup top-level outside onMounted', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-ssr-doc-'));
    await mkdir(join(dir, 'pages'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    await writeFile(
      join(dir, 'pages/index.vue'),
      '<script setup lang="ts">const title = document.title;</script>\n<template><div>{{ title }}</div></template>',
    );
    const files = [join(dir, 'pages/index.vue')];
    const projectInfo = makeProject(dir);
    const diags = await runCrossFilePass({ files, projectInfo });
    const relevant = diags.filter((d) => d.ruleId === RULE_ID);
    expect(relevant.length).toBeGreaterThanOrEqual(1);
  });

  it('warns when localStorage is accessed at setup top-level outside onMounted', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-ssr-ls-'));
    await mkdir(join(dir, 'pages'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    await writeFile(
      join(dir, 'pages/index.vue'),
      '<script setup lang="ts">const stored = localStorage.getItem("x");</script>\n<template><div>{{ stored }}</div></template>',
    );
    const files = [join(dir, 'pages/index.vue')];
    const projectInfo = makeProject(dir);
    const diags = await runCrossFilePass({ files, projectInfo });
    const relevant = diags.filter((d) => d.ruleId === RULE_ID);
    expect(relevant.length).toBeGreaterThanOrEqual(1);
  });
});

describe('ssr-safe-onMounted-only-for-client — does not fire', () => {
  it('does not fire when browser global is inside onMounted', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-ssr-om-'));
    await mkdir(join(dir, 'pages'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    await writeFile(
      join(dir, 'pages/index.vue'),
      '<script setup lang="ts">onMounted(() => { const w = window.innerWidth; });</script>\n<template><div>hi</div></template>',
    );
    const files = [join(dir, 'pages/index.vue')];
    const projectInfo = makeProject(dir);
    const diags = await runCrossFilePass({ files, projectInfo });
    const relevant = diags.filter((d) => d.ruleId === RULE_ID);
    expect(relevant).toHaveLength(0);
  });

  it('does not fire when window is inside onMounted with nested call', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-ssr-om2-'));
    await mkdir(join(dir, 'pages'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    await writeFile(
      join(dir, 'pages/index.vue'),
      '<script setup lang="ts">onMounted(() => { console.log(window.innerWidth); });</script>\n<template><div>hi</div></template>',
    );
    const files = [join(dir, 'pages/index.vue')];
    const projectInfo = makeProject(dir);
    const diags = await runCrossFilePass({ files, projectInfo });
    const relevant = diags.filter((d) => d.ruleId === RULE_ID);
    expect(relevant).toHaveLength(0);
  });

  it('does not fire when there are no browser global accesses', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-ssr-clean-'));
    await mkdir(join(dir, 'pages'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    await writeFile(
      join(dir, 'pages/index.vue'),
      '<script setup lang="ts">const x = 1;</script>\n<template><div>{{ x }}</div></template>',
    );
    const files = [join(dir, 'pages/index.vue')];
    const projectInfo = makeProject(dir);
    const diags = await runCrossFilePass({ files, projectInfo });
    const relevant = diags.filter((d) => d.ruleId === RULE_ID);
    expect(relevant).toHaveLength(0);
  });

  it('returns [] when framework is not nuxt', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-ssr-vue-'));
    await mkdir(join(dir, 'pages'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    await writeFile(
      join(dir, 'pages/index.vue'),
      '<script setup lang="ts">const w = window.innerWidth;</script>\n<template><div>{{ w }}</div></template>',
    );
    const files = [join(dir, 'pages/index.vue')];
    const projectInfo = makeProject(dir, { framework: 'vue' });
    const diags = await runCrossFilePass({ files, projectInfo });
    expect(diags).toHaveLength(0);
  });

  it('returns [] when there are no page files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-ssr-nopages-'));
    await mkdir(join(dir, 'components'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    await writeFile(
      join(dir, 'components/A.vue'),
      '<script setup lang="ts">const w = window.innerWidth;</script>\n<template><div>{{ w }}</div></template>',
    );
    const files = [join(dir, 'components/A.vue')];
    const projectInfo = makeProject(dir);
    const diags = await runCrossFilePass({ files, projectInfo });
    expect(diags).toHaveLength(0);
  });

  it('warns when window is an ExpressionStatement (not assigned)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-ssr-es-'));
    await mkdir(join(dir, 'pages'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    await writeFile(
      join(dir, 'pages/index.vue'),
      '<script setup lang="ts">window.addEventListener("resize", () => {});</script>\n<template><div>hi</div></template>',
    );
    const files = [join(dir, 'pages/index.vue')];
    const projectInfo = makeProject(dir);
    const diags = await runCrossFilePass({ files, projectInfo });
    const relevant = diags.filter((d) => d.ruleId === RULE_ID);
    expect(relevant.length).toBeGreaterThanOrEqual(1);
  });

  it('does not fire when window is inside onMounted as ExpressionStatement', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-ssr-om-es-'));
    await mkdir(join(dir, 'pages'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    await writeFile(
      join(dir, 'pages/index.vue'),
      '<script setup lang="ts">onMounted(() => { window.addEventListener("resize", () => {}); });</script>\n<template><div>hi</div></template>',
    );
    const files = [join(dir, 'pages/index.vue')];
    const projectInfo = makeProject(dir);
    const diags = await runCrossFilePass({ files, projectInfo });
    const relevant = diags.filter((d) => d.ruleId === RULE_ID);
    expect(relevant).toHaveLength(0);
  });

  it('does not fire when window is inside onMounted with if-statement nesting', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-ssr-om-if-'));
    await mkdir(join(dir, 'pages'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    await writeFile(
      join(dir, 'pages/index.vue'),
      '<script setup lang="ts">onMounted(() => { if (true) { console.log(window.innerWidth); } });</script>\n<template><div>hi</div></template>',
    );
    const files = [join(dir, 'pages/index.vue')];
    const projectInfo = makeProject(dir);
    const diags = await runCrossFilePass({ files, projectInfo });
    const relevant = diags.filter((d) => d.ruleId === RULE_ID);
    expect(relevant).toHaveLength(0);
  });

  it('does not fire for watchEffect (intentionally skipped — reactive to prop changes)', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-ssr-watch-'));
    await mkdir(join(dir, 'pages'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    await writeFile(
      join(dir, 'pages/index.vue'),
      '<script setup lang="ts">watchEffect(() => { console.log(window.innerWidth); });</script>\n<template><div>hi</div></template>',
    );
    const files = [join(dir, 'pages/index.vue')];
    const projectInfo = makeProject(dir);
    const diags = await runCrossFilePass({ files, projectInfo });
    const relevant = diags.filter((d) => d.ruleId === RULE_ID);
    expect(relevant).toHaveLength(0);
  });

  it('warns when document is accessed as MemberExpression in ExpressionStatement', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-ssr-doc-es-'));
    await mkdir(join(dir, 'pages'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    await writeFile(
      join(dir, 'pages/index.vue'),
      '<script setup lang="ts">document.getElementById("x");</script>\n<template><div>hi</div></template>',
    );
    const files = [join(dir, 'pages/index.vue')];
    const projectInfo = makeProject(dir);
    const diags = await runCrossFilePass({ files, projectInfo });
    const relevant = diags.filter((d) => d.ruleId === RULE_ID);
    expect(relevant.length).toBeGreaterThanOrEqual(1);
  });

  it('does not fire when onMounted is ExpressionStatement and window is inside callback', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-ssr-om-es2-'));
    await mkdir(join(dir, 'pages'), { recursive: true });
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    await writeFile(
      join(dir, 'pages/index.vue'),
      '<script setup lang="ts">onMounted(() => { window.addEventListener("resize", () => {}); });</script>\n<template><div>hi</div></template>',
    );
    const files = [join(dir, 'pages/index.vue')];
    const projectInfo = makeProject(dir);
    const diags = await runCrossFilePass({ files, projectInfo });
    const relevant = diags.filter((d) => d.ruleId === RULE_ID);
    expect(relevant).toHaveLength(0);
  });
});
