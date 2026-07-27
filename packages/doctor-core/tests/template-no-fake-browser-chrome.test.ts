import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcCache } from '../src/template/parse-sfc.js';
import { runTemplatePass } from '../src/template/run.js';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-chrome-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

const RULE = 'vue-doctor/design/no-fake-browser-chrome';

beforeEach(() => {
  clearSfcCache();
});

describe('runTemplatePass — no-fake-browser-chrome', () => {
  it('flags three traffic-light dots in a parent', async () => {
    const path = await writeVue(
      '<template><div class="flex"><div class="w-3 rounded-full bg-red-500" /><div class="w-3 rounded-full bg-yellow-500" /><div class="w-3 rounded-full bg-green-500" /></div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    const diag = diags.find((d) => d.ruleId === RULE);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe('warn');
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags amber/emerald variants at w-2.5', async () => {
    const path = await writeVue(
      '<template><div><div class="w-2.5 rounded-full bg-red-400" /><div class="w-2.5 rounded-full bg-amber-400" /><div class="w-2.5 rounded-full bg-emerald-400" /></div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('does not flag when a dot is not a div', async () => {
    const path = await writeVue(
      '<template><div><span class="w-3 rounded-full bg-red-500" /><div class="w-3 rounded-full bg-yellow-500" /><div class="w-3 rounded-full bg-green-500" /></div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag dots missing rounded-full', async () => {
    const path = await writeVue(
      '<template><div><div class="w-3 bg-red-500" /><div class="w-3 bg-yellow-500" /><div class="w-3 bg-green-500" /></div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag dots with the wrong width', async () => {
    const path = await writeVue(
      '<template><div><div class="w-6 rounded-full bg-red-500" /><div class="w-6 rounded-full bg-yellow-500" /><div class="w-6 rounded-full bg-green-500" /></div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag round dots that share a single color', async () => {
    const path = await writeVue(
      '<template><div><div class="w-3 rounded-full bg-red-500" /><div class="w-3 rounded-full bg-red-500" /><div class="w-3 rounded-full bg-red-500" /></div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag only two traffic-light dots', async () => {
    const path = await writeVue(
      '<template><div><div class="w-3 rounded-full bg-red-500" /><div class="w-3 rounded-full bg-green-500" /></div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag round dots with no traffic-light color', async () => {
    const path = await writeVue(
      '<template><div><div class="w-3 rounded-full bg-slate-500" /><div class="w-3 rounded-full bg-slate-500" /><div class="w-3 rounded-full bg-slate-500" /></div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });
});
