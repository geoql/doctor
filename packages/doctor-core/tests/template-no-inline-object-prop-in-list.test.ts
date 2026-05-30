import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcCache } from '../src/template/parse-sfc.js';
import { runTemplatePass } from '../src/template/run.js';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-inline-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

const RULE = 'vue-doctor/template/no-inline-object-prop-in-list';

beforeEach(() => {
  clearSfcCache();
});

describe('runTemplatePass — no-inline-object-prop-in-list', () => {
  it('flags an inline object literal prop on a v-for element', async () => {
    const path = await writeVue(
      '<template><Item v-for="x in xs" :key="x.id" :style="{ bold: true }" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    const diag = diags.find((d) => d.ruleId === RULE);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe('warn');
    expect(diag?.source).toBe('template');
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags an inline array literal prop inside a v-for', async () => {
    const path = await writeVue(
      '<template><Item v-for="x in xs" :key="x.id" :items="[1, 2, 3]" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('surfaces every offending prop on the same v-for element (distinct coords for dedup)', async () => {
    const path = await writeVue(
      '<template><Item v-for="x in xs" :key="x.id" :style="{ bold: true }" :items="[1, 2, 3]" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    const ruleDiags = diags.filter((d) => d.ruleId === RULE);
    expect(ruleDiags).toHaveLength(2);
    const cols = ruleDiags.map((d) => d.column).sort((a, b) => a - b);
    expect(cols[0]).not.toBe(cols[1]);
  });

  it('flags inline object props on deep descendants of a v-for', async () => {
    const path = await writeVue(
      '<template><ul v-for="x in xs" :key="x.id"><li><Child :meta="{ deep: true }" /></li></ul></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('does not flag inline object props outside any v-for', async () => {
    const path = await writeVue(
      '<template><Banner :cfg="{ a: 1 }" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a variable-reference prop binding inside a v-for', async () => {
    const path = await writeVue(
      '<template><Item v-for="x in xs" :key="x.id" :style="myObj" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag member-expression, static, no-arg-bind, or event props', async () => {
    const path = await writeVue(
      '<template><Item v-for="x in xs" :key="x.id" :data="x.value" type="row" v-bind="extra" @click="() => ({})" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag the v-for element own :key even when it is an inline literal', async () => {
    const path = await writeVue(
      '<template><Item v-for="x in xs" :key="{ id: x.id }" :style="{ bold: true }" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    const list = diags.filter((d) => d.ruleId === RULE);
    expect(list).toHaveLength(1);
  });

  it('does not flag inline props on a v-for element with no children', async () => {
    const path = await writeVue(
      '<template><Item v-for="x in xs" :key="x.id" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('covers empty root children branch', async () => {
    const path = await writeVue('<template></template>');
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('flags only in-range props when literals sit before, inside, and after a v-for', async () => {
    const path = await writeVue(
      `<template>
  <Header :cfg="{ a: 1 }" />
  <Item v-for="x in xs" :key="x.id" :style="{ bold: true }" :items="[1, 2, 3]">
    <Child :meta="{ deep: true }" />
  </Item>
  <Footer :cfg="[9]" />
</template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(3);
  });
});
