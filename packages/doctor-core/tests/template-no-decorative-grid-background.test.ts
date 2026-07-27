import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcCache } from '../src/template/parse-sfc.js';
import { runTemplatePass } from '../src/template/run.js';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-grid-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

const RULE = 'vue-doctor/design/no-decorative-grid-background';

beforeEach(() => {
  clearSfcCache();
});

describe('runTemplatePass — no-decorative-grid-background', () => {
  it('flags a named bg-grid class', async () => {
    const path = await writeVue('<template><div class="bg-grid" /></template>');
    const diags = await runTemplatePass({ files: [path] });
    const diag = diags.find((d) => d.ruleId === RULE);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe('warn');
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags a grid-pattern class', async () => {
    const path = await writeVue(
      '<template><div class="grid-pattern" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags layered arbitrary linear-gradient grid classes', async () => {
    const path = await writeVue(
      '<template><div class="bg-[linear-gradient(to_right,#fff_1px,transparent_1px)] bg-[repeating-linear-gradient(0deg,#eee,transparent)]" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('does not flag a single gradient without layering or a grid name', async () => {
    const path = await writeVue(
      '<template><div class="bg-[linear-gradient(to_right,#fff,transparent)]" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a plain surface class', async () => {
    const path = await writeVue(
      '<template><div class="bg-surface grid grid-cols-2" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });
});
