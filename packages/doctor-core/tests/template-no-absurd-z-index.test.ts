import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcCache } from '../src/template/parse-sfc.js';
import { runTemplatePass } from '../src/template/run.js';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-zindex-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

const RULE = 'vue-doctor/design/no-absurd-z-index';

beforeEach(() => {
  clearSfcCache();
});

describe('runTemplatePass — no-absurd-z-index', () => {
  it('flags an arbitrary z-[9999] class', async () => {
    const path = await writeVue(
      '<template><div class="z-[9999]" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    const diag = diags.find((d) => d.ruleId === RULE);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe('warn');
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags a hardcoded inline z-index >= 1000', async () => {
    const path = await writeVue(
      '<template><div style="z-index: 10000;" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('reports class and inline offenders on distinct coordinates', async () => {
    const path = await writeVue(
      '<template><div class="z-[9999]" style="z-index: 5000;" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    const list = diags.filter((d) => d.ruleId === RULE);
    expect(list).toHaveLength(2);
    expect(new Set(list.map((d) => `${d.line}:${d.column}`)).size).toBe(2);
  });

  it('does not flag a small arbitrary z-index', async () => {
    const path = await writeVue('<template><div class="z-[10]" /></template>');
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a small inline z-index', async () => {
    const path = await writeVue(
      '<template><div style="z-index: 50;" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a standard z-50 utility', async () => {
    const path = await writeVue('<template><div class="z-50" /></template>');
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });
});
