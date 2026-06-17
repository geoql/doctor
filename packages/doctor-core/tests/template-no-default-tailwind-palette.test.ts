import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcCache } from '../src/template/parse-sfc.js';
import { runTemplatePass } from '../src/template/run.js';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-pal-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

const RULE = 'vue-doctor/design/no-default-tailwind-palette';

beforeEach(() => {
  clearSfcCache();
});

describe('runTemplatePass — no-default-tailwind-palette', () => {
  it('flags a default palette utility like bg-blue-600', async () => {
    const path = await writeVue(
      '<template><button class="bg-blue-600 text-white" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    const diag = diags.find((d) => d.ruleId === RULE);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe('warn');
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags a default palette utility with a variant prefix', async () => {
    const path = await writeVue(
      '<template><button class="hover:bg-red-500" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags a default palette utility in a bound :class', async () => {
    const path = await writeVue(
      `<template><button :class="active ? 'text-emerald-400' : ''" /></template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('does not flag a brand-token color utility', async () => {
    const path = await writeVue(
      '<template><button class="bg-primary-600 text-on-primary" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag non-color utilities that contain a palette word', async () => {
    const path = await writeVue(
      '<template><div class="grid place-content-center" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });
});
