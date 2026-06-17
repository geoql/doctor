import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcCache } from '../src/template/parse-sfc.js';
import { runTemplatePass } from '../src/template/run.js';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-tbr-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

const RULE = 'vue-doctor/security/no-target-blank-without-rel';

beforeEach(() => {
  clearSfcCache();
});

describe('runTemplatePass — no-target-blank-without-rel', () => {
  it('flags an anchor with target="_blank" and no rel', async () => {
    const path = await writeVue(
      '<template><a href="https://x.com" target="_blank">Open</a></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    const diag = diags.find((d) => d.ruleId === RULE);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe('warn');
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags when rel is present but missing noopener', async () => {
    const path = await writeVue(
      '<template><a href="https://x.com" target="_blank" rel="nofollow">Open</a></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags a bound :target="_blank" without rel', async () => {
    const path = await writeVue(
      `<template><a href="https://x.com" :target="'_blank'">Open</a></template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('does not flag when rel includes noopener', async () => {
    const path = await writeVue(
      '<template><a href="https://x.com" target="_blank" rel="noopener noreferrer">Open</a></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a same-tab anchor', async () => {
    const path = await writeVue(
      '<template><a href="/local">Open</a></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag target on a non-anchor element', async () => {
    const path = await writeVue(
      '<template><form target="_blank" action="/x" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a bound rel that includes noopener', async () => {
    const path = await writeVue(
      `<template><a href="https://x.com" target="_blank" :rel="'noopener'">Open</a></template>`,
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a bound :target whose unquoted value is not _blank', async () => {
    const path = await writeVue(
      '<template><a href="https://x.com" :target="targetVar">Open</a></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('flags target="_blank" with a valueless rel attribute', async () => {
    const path = await writeVue(
      '<template><a href="https://x.com" target="_blank" rel>Open</a></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });
});
