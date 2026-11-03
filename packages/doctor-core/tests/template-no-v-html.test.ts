import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { isEscapedJsonStringifyExpression } from '../src/template/escaped-json.js';
import { clearSfcCache } from '../src/template/parse-sfc.js';
import { runTemplatePass } from '../src/template/run.js';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-vhtml-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

const RULE = 'vue-doctor/security/no-v-html';

beforeEach(() => {
  clearSfcCache();
});

describe('runTemplatePass — no-v-html', () => {
  it('flags a v-html directive', async () => {
    const path = await writeVue(
      '<template><div v-html="userBio" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    const diag = diags.find((d) => d.ruleId === RULE);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe('error');
    expect(diag?.source).toBe('template');
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags v-html with a modifier/dynamic form too', async () => {
    const path = await writeVue(
      '<template><article v-html="post.body"></article></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('reports each v-html on its own coordinates', async () => {
    const path = await writeVue(
      '<template><div v-html="a" /><span v-html="b" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    const list = diags.filter((d) => d.ruleId === RULE);
    expect(list).toHaveLength(2);
    const keys = list.map((d) => `${d.line}:${d.column}`);
    expect(new Set(keys).size).toBe(2);
  });

  it('does not flag text interpolation', async () => {
    const path = await writeVue(
      '<template><div>{{ userBio }}</div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a v-bind directive', async () => {
    const path = await writeVue('<template><div :title="t" /></template>');
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  // react.doctor #2011: JSON.stringify output with `<` escaped cannot open a
  // tag, so it is safe to inject as raw HTML (e.g. JSON-LD).
  it.each([
    String.raw`JSON.stringify(ld).replace(/</g, '\\u003c')`,
    String.raw`JSON.stringify(ld).replaceAll('<', '\\u003c')`,
    String.raw`JSON.stringify(ld).replaceAll(/</g, '\\u003C')`,
    String.raw`JSON.stringify(toLd(post)).replace(/</g, '&amp;lt;').replace(/>/g, '\\u003e')`,
  ])('does not flag escaped JSON.stringify output: %s', async (exp) => {
    const path = await writeVue(
      `<template><Script type="application/ld+json" v-html="${exp}" /></template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it.each([
    'JSON.stringify(ld)',
    String.raw`JSON.stringify(ld).replace(/>/g, '\\u003e')`,
    String.raw`JSON.stringify(ld).replace(/</, '\\u003c')`,
    String.raw`JSON.stringify(ld).replace(/</g, '\u003c')`,
    String.raw`JSON.stringify(ld).replace(/</g, fn)`,
    String.raw`JSON.stringify(ld).replace(/</g)`,
    String.raw`JSON.stringify(ld).replace(re, '\\u003c')`,
    String.raw`JSON.stringify(ld).replace('<', '\\u003c')`,
    String.raw`JSON.stringify(ld).replaceAll('>', '\\u003c')`,
    String.raw`JSON.stringify(ld).replace`,
    String.raw`JSON.stringify(ld)[method](/</g, '\\u003c')`,
    String.raw`bio.replace(/</g, '\\u003c')`,
    String.raw`JSON.parse(ld).replace(/</g, '\\u003c')`,
    String.raw`stringify(ld).replace(/</g, '\\u003c')`,
    String.raw`JSON['stringify'](ld).replace(/</g, '\\u003c')`,
  ])('still flags unescaped or unproven JSON output: %s', async (exp) => {
    const path = await writeVue(`<template><div v-html="${exp}" /></template>`);
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('treats an expression that is not a statement as unproven', () => {
    expect(isEscapedJsonStringifyExpression('')).toBe(false);
  });
});
