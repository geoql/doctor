import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcCache } from '../src/template/parse-sfc.js';
import { runTemplatePass } from '../src/template/run.js';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-getter-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

const RULE = 'vue-doctor/template/no-computed-getter-in-template-loop';

beforeEach(() => {
  clearSfcCache();
});

describe('runTemplatePass — no-computed-getter-in-template-loop', () => {
  it('flags a .value access in an interpolation inside a v-for', async () => {
    const path = await writeVue(
      '<template><div v-for="x in xs" :key="x.id">{{ data.value }}</div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    const diag = diags.find((d) => d.ruleId === RULE);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe('warn');
    expect(diag?.source).toBe('template');
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags a .value access in a bound prop inside a v-for', async () => {
    const path = await writeVue(
      '<template><div v-for="x in xs" :key="x.id" :title="data.value">x</div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags a .value access on a deep descendant of a v-for', async () => {
    const path = await writeVue(
      '<template><ul v-for="x in xs" :key="x.id"><li>{{ count.value }}</li></ul></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags a .value access on the v-for item identifier itself', async () => {
    const path = await writeVue(
      '<template><div v-for="x in xs" :key="x.id">{{ x.value }}</div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('does not flag a .value access outside any v-for', async () => {
    const path = await writeVue(
      '<template><div>{{ data.value }}</div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a bare identifier interpolation with no .value access', async () => {
    const path = await writeVue(
      '<template><div v-for="x in xs" :key="x.id">{{ data }}</div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a deep member chain like obj.prop.value', async () => {
    const path = await writeVue(
      '<template><div v-for="x in xs" :key="x.id">{{ obj.prop.value }}</div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a computed member access like data[key]', async () => {
    const path = await writeVue(
      `<template><div v-for="x in xs" :key="x.id">{{ data['value'] }}</div></template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a non-value member access like data.id', async () => {
    const path = await writeVue(
      '<template><div v-for="x in xs" :key="x.id">{{ data.id }}</div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a non-member expression like a + b', async () => {
    const path = await writeVue(
      '<template><div v-for="x in xs" :key="x.id">{{ a + b }}</div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('flags a .value access nested inside a compound expression', async () => {
    const path = await writeVue(
      '<template><div v-for="x in xs" :key="x.id">{{ a + b.value }}</div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags a .value access nested inside an array literal with an elided hole', async () => {
    const path = await writeVue(
      '<template><div v-for="x in xs" :key="x.id">{{ [, count.value] }}</div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags only the in-loop .value when text sits before and after the v-for', async () => {
    const path = await writeVue(
      `<template>
  <div>{{ outside.value }}</div>
  <div v-for="x in xs" :key="x.id">{{ inside.value }}</div>
</template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('surfaces a prop .value and an interpolation .value with distinct coords', async () => {
    const path = await writeVue(
      '<template><div v-for="x in xs" :key="x.id" :title="data.value">{{ count.value }}</div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    const ruleDiags = diags.filter((d) => d.ruleId === RULE);
    expect(ruleDiags).toHaveLength(2);
    const coords = ruleDiags.map((d) => `${d.line}:${d.column}`);
    expect(new Set(coords).size).toBe(2);
  });

  it('ignores static attrs and event handlers while flagging the .value prop', async () => {
    const path = await writeVue(
      '<template><div v-for="x in xs" :key="x.id" type="row" :title="data.value" @click="f">x</div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('covers empty root children branch', async () => {
    const path = await writeVue('<template></template>');
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });
});
