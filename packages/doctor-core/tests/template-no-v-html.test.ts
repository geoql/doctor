import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
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
});
