import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { audit } from '../src/audit.js';

async function nuxtFixture(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-nuxt-wire-'));
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'test', dependencies: { nuxt: '^4.4.0' } }),
  );
  return dir;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('nuxt-project wiring in audit', () => {
  it('emits a nuxt project diagnostic for a nuxt fixture', async () => {
    const dir = await nuxtFixture();
    const report = await audit({ rootDir: dir, deadCode: false, lint: false });
    const diag = report.diagnostics.find(
      (d) => d.ruleId === 'nuxt-doctor/nitro/compatibilityDate-set',
    );
    expect(diag).toBeDefined();
    expect(diag!.source).toBe('project');
    expect(diag!.severity).toBe('error');
  });

  it('remaps a nuxt diagnostic severity via a rule override', async () => {
    const dir = await nuxtFixture();
    const report = await audit({
      rootDir: dir,
      deadCode: false,
      lint: false,
      rules: { 'nuxt-doctor/nitro/compatibilityDate-set': 'warn' },
    });
    const diag = report.diagnostics.find(
      (d) => d.ruleId === 'nuxt-doctor/nitro/compatibilityDate-set',
    );
    expect(diag).toBeDefined();
    expect(diag!.severity).toBe('warn');
  });

  it('filters out a nuxt diagnostic when the rule is off', async () => {
    const dir = await nuxtFixture();
    const report = await audit({
      rootDir: dir,
      deadCode: false,
      lint: false,
      rules: { 'nuxt-doctor/nitro/compatibilityDate-set': 'off' },
    });
    expect(
      report.diagnostics.some(
        (d) => d.ruleId === 'nuxt-doctor/nitro/compatibilityDate-set',
      ),
    ).toBe(false);
  });

  it('does not emit nuxt diagnostics for a non-nuxt project', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-nuxt-wire-'));
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'test', dependencies: { vue: '^3.5.0' } }),
    );
    const report = await audit({ rootDir: dir, deadCode: false, lint: false });
    expect(
      report.diagnostics.some((d) => d.ruleId.startsWith('nuxt-doctor/')),
    ).toBe(false);
  });

  it('survives a nuxt-project pass failure gracefully', async () => {
    const dir = await nuxtFixture();
    const mod = await import('../src/check-nuxt-project.js');
    vi.spyOn(mod, 'checkNuxtProject').mockRejectedValueOnce(
      new Error('nuxt pass exploded'),
    );
    const report = await audit({ rootDir: dir, deadCode: false, lint: false });
    expect(
      report.diagnostics.some((d) => d.ruleId.startsWith('nuxt-doctor/')),
    ).toBe(false);
  });
});

const SHARED_KEY_RULE = 'nuxt-doctor/data-fetching/no-shared-key-across-pages';

async function nuxtSharedKeyFixture(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-nuxt-cf-'));
  const { mkdir } = await import('node:fs/promises');
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'test', dependencies: { nuxt: '^4.4.0' } }),
  );
  await mkdir(join(dir, 'pages'), { recursive: true });
  await writeFile(
    join(dir, 'pages/a.vue'),
    '<script setup lang="ts">const { data } = await useAsyncData("dup", () => $fetch("/a"));</script>\n<template><div /></template>',
  );
  await writeFile(
    join(dir, 'pages/b.vue'),
    '<script setup lang="ts">const { data } = await useFetch("dup");</script>\n<template><div /></template>',
  );
  return dir;
}

describe('cross-file wiring in audit', () => {
  it('emits a cross-file diagnostic for shared keys across pages', async () => {
    const dir = await nuxtSharedKeyFixture();
    const report = await audit({ rootDir: dir, deadCode: false, lint: false });
    const diag = report.diagnostics.find((d) => d.ruleId === SHARED_KEY_RULE);
    expect(diag).toBeDefined();
    expect(diag!.source).toBe('cross-file');
  });

  it('remaps a cross-file diagnostic severity via a rule override', async () => {
    const dir = await nuxtSharedKeyFixture();
    const report = await audit({
      rootDir: dir,
      deadCode: false,
      lint: false,
      rules: { [SHARED_KEY_RULE]: 'info' },
    });
    const diag = report.diagnostics.find((d) => d.ruleId === SHARED_KEY_RULE);
    expect(diag).toBeDefined();
    expect(diag!.severity).toBe('info');
  });

  it('filters out a cross-file diagnostic when the rule is off', async () => {
    const dir = await nuxtSharedKeyFixture();
    const report = await audit({
      rootDir: dir,
      deadCode: false,
      lint: false,
      rules: { [SHARED_KEY_RULE]: 'off' },
    });
    expect(report.diagnostics.some((d) => d.ruleId === SHARED_KEY_RULE)).toBe(
      false,
    );
  });

  it('survives a cross-file pass failure gracefully', async () => {
    const dir = await nuxtSharedKeyFixture();
    const mod = await import('../src/nuxt/cross-file/run.js');
    vi.spyOn(mod, 'runCrossFilePass').mockRejectedValueOnce(
      new Error('cross-file exploded'),
    );
    const report = await audit({ rootDir: dir, deadCode: false, lint: false });
    expect(report.diagnostics.some((d) => d.ruleId === SHARED_KEY_RULE)).toBe(
      false,
    );
  });
});
