import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcCache } from '../src/template/parse-sfc.js';
import { runTemplatePass } from '../src/template/run.js';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-arb-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

const RULE = 'vue-doctor/design/no-arbitrary-tailwind-values';

beforeEach(() => {
  clearSfcCache();
});

describe('runTemplatePass — no-arbitrary-tailwind-values', () => {
  it('flags an arbitrary-value class on a static class attribute', async () => {
    const path = await writeVue(
      '<template><div class="w-[412px] text-sm" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    const diag = diags.find((d) => d.ruleId === RULE);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe('warn');
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags arbitrary values in a bound :class string', async () => {
    const path = await writeVue(
      `<template><div :class="'h-[calc(100vh-60px)]'" /></template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('reports static and bound class on distinct coordinates', async () => {
    const path = await writeVue(
      `<template><div class="w-[10px]" :class="'p-[2px]'" /></template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    const list = diags.filter((d) => d.ruleId === RULE);
    expect(list).toHaveLength(2);
    expect(new Set(list.map((d) => `${d.line}:${d.column}`)).size).toBe(2);
  });

  it('does not flag a class with only standard utilities', async () => {
    const path = await writeVue(
      '<template><div class="w-full text-sm bg-primary" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag an element with no class', async () => {
    const path = await writeVue('<template><div id="x" /></template>');
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('ignores non-class directives while still scanning the static class', async () => {
    const path = await writeVue(
      '<template><div class="w-[10px]" v-if="show" :style="s" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('ignores an argument-less v-bind while still scanning the static class', async () => {
    const path = await writeVue(
      '<template><div class="w-[10px]" v-bind="attrs" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });
});
