import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcCache } from '../src/template/parse-sfc.js';
import { runTemplatePass } from '../src/template/run.js';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-inline-style-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

const RULE = 'vue-doctor/design/no-hardcoded-inline-style';

beforeEach(() => {
  clearSfcCache();
});

describe('runTemplatePass — no-hardcoded-inline-style', () => {
  it('flags an inline style with a hardcoded px value', async () => {
    const path = await writeVue(
      '<template><div style="width: 240px;" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    const diag = diags.find((d) => d.ruleId === RULE);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe('warn');
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags an inline style with a hardcoded hex color', async () => {
    const path = await writeVue(
      '<template><div style="color: #333;" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('reports only once per style attribute even with multiple offenders', async () => {
    const path = await writeVue(
      '<template><div style="width: 240px; color: #333;" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('does not flag a style with only non-hardcoded values', async () => {
    const path = await writeVue(
      '<template><div style="display: flex;" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag an element without a style attribute', async () => {
    const path = await writeVue('<template><div class="w-60" /></template>');
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a bound :style binding', async () => {
    const path = await writeVue(
      '<template><div :style="dynamicStyle" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });
});
