import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcCache } from '../src/template/parse-sfc.js';
import { runTemplatePass } from '../src/template/run.js';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-emoji-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

const RULE = 'vue-doctor/design/no-emoji-heading-decoration';

beforeEach(() => {
  clearSfcCache();
});

describe('runTemplatePass — no-emoji-heading-decoration', () => {
  it('flags a heading starting with an emoji', async () => {
    const path = await writeVue('<template><h1>🚀 Ship it</h1></template>');
    const diags = await runTemplatePass({ files: [path] });
    const diag = diags.find((d) => d.ruleId === RULE);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe('warn');
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags a heading ending with an emoji', async () => {
    const path = await writeVue('<template><h2>Done ✅</h2></template>');
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags an h3 wrapped in emoji', async () => {
    const path = await writeVue('<template><h3>🔥 Hot 🔥</h3></template>');
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('does not flag a non-heading element with an emoji', async () => {
    const path = await writeVue('<template><p>🚀 Ship it</p></template>');
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a heading with only an interpolation', async () => {
    const path = await writeVue('<template><h1>{{ emoji }}</h1></template>');
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a plain-text heading', async () => {
    const path = await writeVue('<template><h1>Ship it</h1></template>');
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag an empty heading', async () => {
    const path = await writeVue('<template><h1></h1></template>');
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });
});
