import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcCache } from '../src/template/parse-sfc.js';
import { runTemplatePass } from '../src/template/run.js';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-vapor-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

const V_MEMO = 'vue-doctor/template/v-memo-on-large-list';
const NO_V_MEMO_IN_VAPOR = 'vue-doctor/template/no-v-memo-in-vapor';

const bigList = `[${Array.from({ length: 101 }, (_, i) => i).join(',')}]`;

beforeEach(() => {
  clearSfcCache();
});

describe('runTemplatePass — Vapor capability gating', () => {
  it('fires v-memo-on-large-list in a NON-vapor SFC', async () => {
    const path = await writeVue(
      `<script setup>const xs = ${bigList};</script><template><Item v-for="x in xs" :key="x" /></template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === V_MEMO)).toBe(true);
  });

  it('SUPPRESSES v-memo-on-large-list in a vapor SFC (disabledBy: vue:vapor)', async () => {
    const path = await writeVue(
      `<script setup vapor>const xs = ${bigList};</script><template><Item v-for="x in xs" :key="x" /></template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === V_MEMO)).toBe(false);
  });

  it('does NOT fire no-v-memo-in-vapor in a non-vapor SFC (requires: vue:vapor)', async () => {
    const path = await writeVue(
      `<template><Item v-for="x in xs" :key="x.id" v-memo="[x.id]" /></template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === NO_V_MEMO_IN_VAPOR)).toBe(false);
  });

  it('fires no-v-memo-in-vapor when v-memo is used in a vapor SFC', async () => {
    const path = await writeVue(
      `<script setup vapor>const xs = [];</script><template><Item v-for="x in xs" :key="x.id" v-memo="[x.id]" /></template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    const list = diags.filter((d) => d.ruleId === NO_V_MEMO_IN_VAPOR);
    expect(list).toHaveLength(1);
    expect(list[0]?.severity).toBe('warn');
  });

  it('detects vapor via a <template vapor> attribute too', async () => {
    const path = await writeVue(
      `<template vapor><Item v-for="x in xs" :key="x.id" v-memo="[x.id]" /></template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === NO_V_MEMO_IN_VAPOR)).toBe(true);
  });
});
