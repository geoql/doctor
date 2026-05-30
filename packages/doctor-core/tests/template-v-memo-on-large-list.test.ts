import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcCache } from '../src/template/parse-sfc.js';
import { runTemplatePass } from '../src/template/run.js';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-memo-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

const RULE = 'vue-doctor/template/v-memo-on-large-list';
const bigArray = Array.from({ length: 101 }, (_, i) => i).join(', ');

beforeEach(() => {
  clearSfcCache();
});

describe('runTemplatePass — v-memo-on-large-list', () => {
  it('flags v-for over a >100 element array literal without v-memo', async () => {
    const path = await writeVue(
      `<script setup>
import { ref } from 'vue';
const items = [${bigArray}];
const small = [1, 2, 3];
const count = 5;
let pending;
const { picked } = source;
function noop() {}
</script>
<template><div v-for="i in items">{{ i }}</div></template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    const diag = diags.find((d) => d.ruleId === RULE);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe('warn');
    expect(diag?.source).toBe('template');
  });

  it('does not flag when v-memo is present on the element', async () => {
    const path = await writeVue(
      `<script setup>const items = [${bigArray}];</script>
<template><div v-for="i in items" v-memo="[i]">{{ i }}</div></template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag an array literal of 100 or fewer elements (plain script block)', async () => {
    const path = await writeVue(
      `<script>const items = [1, 2, 3];</script>
<template><div v-for="i in items">{{ i }}</div></template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag when the source is a function call, not an array literal', async () => {
    const path = await writeVue(
      `<script setup>const items = useFetch();</script>
<template><div v-for="i in items">{{ i }}</div></template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag var declarations (not const/let)', async () => {
    const path = await writeVue(
      `<script setup>var items = [${bigArray}];</script>
<template><div v-for="i in items">{{ i }}</div></template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag an element without v-for and tolerates a missing script block', async () => {
    const path = await writeVue('<template><div>{{ value }}</div></template>');
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a malformed v-for with no parseable source', async () => {
    const path = await writeVue(
      `<script setup>const items = [${bigArray}];</script>
<template><div v-for="">x</div></template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });
});
