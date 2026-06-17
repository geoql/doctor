import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcCache } from '../src/template/parse-sfc.js';
import { runTemplatePass } from '../src/template/run.js';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-jsuri-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

const RULE = 'vue-doctor/security/no-javascript-uri';

beforeEach(() => {
  clearSfcCache();
});

describe('runTemplatePass — no-javascript-uri', () => {
  it('flags a static href with a javascript: scheme', async () => {
    const path = await writeVue(
      '<template><a href="javascript:alert(1)">Run</a></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    const diag = diags.find((d) => d.ruleId === RULE);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe('error');
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags a bound :href string literal with a javascript: scheme', async () => {
    const path = await writeVue(
      `<template><a :href="'javascript:doEvil()'">Run</a></template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags a bound :href template literal with a javascript: scheme', async () => {
    const path = await writeVue(
      '<template><a :href="`javascript:${code}`">Run</a></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags a data:text/html src', async () => {
    const path = await writeVue(
      '<template><iframe src="data:text/html,<script>x</script>" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('is case-insensitive and tolerates leading whitespace', async () => {
    const path = await writeVue(
      '<template><a href=" JavaScript:alert(1)">Run</a></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('does not flag a safe static href', async () => {
    const path = await writeVue(
      '<template><a href="/dashboard">View</a></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a bound href referencing a safe variable', async () => {
    const path = await writeVue(
      '<template><a :href="safePath">View</a></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a regular image src', async () => {
    const path = await writeVue(
      '<template><img src="https://cdn.example.com/i.jpg" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a valueless href attribute', async () => {
    const path = await writeVue('<template><a href>Run</a></template>');
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag an argument-less v-bind spread', async () => {
    const path = await writeVue(
      '<template><a v-bind="attrs">Run</a></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a bound href directive that has an argument but no expression', async () => {
    const path = await writeVue('<template><a :href>Run</a></template>');
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a non-bind directive on a URI sink element', async () => {
    const path = await writeVue(
      '<template><a v-if="show" href="/ok">Run</a></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });
});
