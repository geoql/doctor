import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcCache } from '../src/template/parse-sfc.js';
import { runTemplatePass } from '../src/template/run.js';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-glass-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

const RULE = 'vue-doctor/design/no-repeated-glass-surfaces';

beforeEach(() => {
  clearSfcCache();
});

describe('runTemplatePass — no-repeated-glass-surfaces', () => {
  it('flags three sibling frosted-glass panels', async () => {
    const glass = 'backdrop-blur-lg border bg-white/10';
    const path = await writeVue(
      `<template><div><div class="${glass}">a</div><div class="${glass}">b</div><div class="${glass}">c</div></div></template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    const diag = diags.find((d) => d.ruleId === RULE);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe('warn');
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags glass panels using an oklch translucent bg', async () => {
    const glass = 'backdrop-blur border bg-[oklch(0.2_0.02_254/0.4)]';
    const path = await writeVue(
      `<template><div><div class="${glass}">a</div><div class="${glass}">b</div><div class="${glass}">c</div></div></template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('does not flag only two glass panels', async () => {
    const glass = 'backdrop-blur-lg border bg-white/10';
    const path = await writeVue(
      `<template><div><div class="${glass}">a</div><div class="${glass}">b</div></div></template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag panels missing backdrop-blur', async () => {
    const glass = 'border bg-white/10';
    const path = await writeVue(
      `<template><div><div class="${glass}">a</div><div class="${glass}">b</div><div class="${glass}">c</div></div></template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag panels missing a border', async () => {
    const glass = 'backdrop-blur-lg bg-white/10';
    const path = await writeVue(
      `<template><div><div class="${glass}">a</div><div class="${glass}">b</div><div class="${glass}">c</div></div></template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag panels with an opaque background', async () => {
    const glass = 'backdrop-blur-lg border bg-surface';
    const path = await writeVue(
      `<template><div><div class="${glass}">a</div><div class="${glass}">b</div><div class="${glass}">c</div></div></template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });
});
