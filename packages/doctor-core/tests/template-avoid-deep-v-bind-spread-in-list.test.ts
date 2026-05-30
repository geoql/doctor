import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcCache } from '../src/template/parse-sfc.js';
import { runTemplatePass } from '../src/template/run.js';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-spread-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

const RULE = 'vue-doctor/template/avoid-deep-v-bind-spread-in-list';

beforeEach(() => {
  clearSfcCache();
});

describe('runTemplatePass — avoid-deep-v-bind-spread-in-list', () => {
  it('flags a v-bind identifier spread on a v-for element', async () => {
    const path = await writeVue(
      '<template><div v-for="x in xs" :key="x.id" id="r" v-bind="someObj" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    const diag = diags.find((d) => d.ruleId === RULE);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe('info');
    expect(diag?.source).toBe('template');
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags a v-bind identifier spread on a deep descendant of a v-for', async () => {
    const path = await writeVue(
      '<template><ul v-for="x in xs" :key="x.id"><Item v-bind="cfg" /></ul></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('does not flag a v-bind identifier spread outside any v-for', async () => {
    const path = await writeVue('<template><div v-bind="cfg" /></template>');
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a regular argumented bind inside a v-for', async () => {
    const path = await writeVue(
      '<template><div v-for="x in xs" :key="x.id" :foo="cfg" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a v-bind spread of an inline object literal', async () => {
    const path = await writeVue(
      '<template><div v-for="x in xs" :key="x.id" v-bind="{ a: 1 }" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a v-bind spread of a member expression', async () => {
    const path = await writeVue(
      '<template><div v-for="x in xs" :key="x.id" v-bind="state.cfg" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag an empty-value v-bind spread inside a v-for', async () => {
    const path = await writeVue(
      '<template><div v-for="x in xs" :key="x.id" v-bind="" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('surfaces spreads on both a v-for element and its descendant distinctly', async () => {
    const path = await writeVue(
      '<template><ul v-for="x in xs" :key="x.id" v-bind="rootCfg"><Item v-bind="itemCfg" /></ul></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    const ruleDiags = diags.filter((d) => d.ruleId === RULE);
    expect(ruleDiags).toHaveLength(2);
    const coords = ruleDiags.map((d) => `${d.line}:${d.column}`);
    expect(new Set(coords).size).toBe(2);
  });

  it('covers empty root children branch', async () => {
    const path = await writeVue('<template></template>');
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });
});
