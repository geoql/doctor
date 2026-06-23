import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcCache } from '../src/template/parse-sfc.js';
import { runTemplatePass } from '../src/template/run.js';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-randkey-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

const RULE = 'vue-doctor/template/no-random-key';

beforeEach(() => {
  clearSfcCache();
});

describe('runTemplatePass — no-random-key', () => {
  it('flags :key="Math.random()" on a v-for element', async () => {
    const path = await writeVue(
      '<template><Item v-for="x in xs" :key="Math.random()" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    const diag = diags.find((d) => d.ruleId === RULE);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe('warn');
    expect(diag?.source).toBe('template');
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags :key="Date.now()"', async () => {
    const path = await writeVue(
      '<template><Item v-for="x in xs" :key="Date.now()" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags :key from a fresh uuid()/nanoid() call', async () => {
    const path = await writeVue(
      '<template><Item v-for="x in xs" :key="nanoid()" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags :key bound to the v-for index variable', async () => {
    const path = await writeVue(
      '<template><Item v-for="(x, i) in xs" :key="i" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('does NOT flag a stable :key="x.id"', async () => {
    const path = await writeVue(
      '<template><Item v-for="x in xs" :key="x.id" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does NOT flag a v-for element with no :key (that is v-for-has-key territory)', async () => {
    const path = await writeVue(
      '<template><Item v-for="x in xs" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does NOT flag :key="Math.random()" outside any v-for', async () => {
    const path = await writeVue(
      '<template><Item :key="Math.random()" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does NOT flag an index-named binding when it is the stable item (no index in v-for)', async () => {
    const path = await writeVue(
      '<template><Item v-for="i in xs" :key="i.id" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does NOT flag a static string key', async () => {
    const path = await writeVue(
      '<template><Item v-for="x in xs" key="static" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });
});
