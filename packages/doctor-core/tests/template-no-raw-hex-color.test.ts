import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcCache } from '../src/template/parse-sfc.js';
import { runTemplatePass } from '../src/template/run.js';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-hex-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

const RULE = 'vue-doctor/design/no-raw-hex-color';

beforeEach(() => {
  clearSfcCache();
});

describe('runTemplatePass — no-raw-hex-color', () => {
  it('flags a hex color inside an arbitrary class value', async () => {
    const path = await writeVue(
      '<template><div class="bg-[#ff0000]" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    const diag = diags.find((d) => d.ruleId === RULE);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe('warn');
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags a hex color inside an inline style', async () => {
    const path = await writeVue(
      '<template><div style="color: #00ff00;" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags a 3-digit hex and an 8-digit hex', async () => {
    const path = await writeVue(
      '<template><div style="color: #abc" class="text-[#11223344]" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(2);
  });

  it('does not flag token-based classes', async () => {
    const path = await writeVue(
      '<template><div class="bg-danger text-success" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a non-hex inline style', async () => {
    const path = await writeVue(
      '<template><div style="display: flex;" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });
});
