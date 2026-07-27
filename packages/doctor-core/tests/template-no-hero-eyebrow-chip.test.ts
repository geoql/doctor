import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcCache } from '../src/template/parse-sfc.js';
import { runTemplatePass } from '../src/template/run.js';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-eyebrow-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

const RULE = 'vue-doctor/design/no-hero-eyebrow-chip';

beforeEach(() => {
  clearSfcCache();
});

describe('runTemplatePass — no-hero-eyebrow-chip', () => {
  it('flags a rounded-full uppercase-tracked chip above an h1', async () => {
    const path = await writeVue(
      '<template><div><span class="uppercase tracking-wide rounded-full">New</span><h1>Ship faster</h1></div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    const diag = diags.find((d) => d.ruleId === RULE);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe('warn');
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags a bordered padded chip above an h1', async () => {
    const path = await writeVue(
      '<template><div><p class="uppercase tracking-widest border px-4">Beta</p><h1>Ship faster</h1></div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('does not flag a chip that is not immediately before the h1', async () => {
    const path = await writeVue(
      '<template><div><span class="uppercase tracking-wide rounded-full">New</span><p>gap</p><h1>Ship</h1></div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag when the preceding element lacks uppercase', async () => {
    const path = await writeVue(
      '<template><div><span class="tracking-wide rounded-full">New</span><h1>Ship</h1></div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag when tracking is tracking-normal', async () => {
    const path = await writeVue(
      '<template><div><span class="uppercase tracking-normal rounded-full">New</span><h1>Ship</h1></div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag an uppercase tracked label without a pill treatment', async () => {
    const path = await writeVue(
      '<template><div><span class="uppercase tracking-wide">New</span><h1>Ship</h1></div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a chip followed by an h2 instead of h1', async () => {
    const path = await writeVue(
      '<template><div><span class="uppercase tracking-wide rounded-full">New</span><h2>Ship</h2></div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a lone h1 with no preceding sibling', async () => {
    const path = await writeVue(
      '<template><div><h1>Ship</h1></div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });
});
