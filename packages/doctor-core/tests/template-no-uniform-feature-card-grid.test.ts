import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcCache } from '../src/template/parse-sfc.js';
import { runTemplatePass } from '../src/template/run.js';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-cards-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

const RULE = 'vue-doctor/design/no-uniform-feature-card-grid';

beforeEach(() => {
  clearSfcCache();
});

describe('runTemplatePass — no-uniform-feature-card-grid', () => {
  it('flags a 3-col grid of three identical cards', async () => {
    const path = await writeVue(
      '<template><div class="grid grid-cols-3"><div class="card p-4">a</div><div class="card p-4">b</div><div class="card p-4">c</div></div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    const diag = diags.find((d) => d.ruleId === RULE);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe('warn');
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('does not flag a grid whose cards differ', async () => {
    const path = await writeVue(
      '<template><div class="grid grid-cols-3"><div class="card col-span-2">a</div><div class="card">b</div><div class="card">c</div></div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a non-grid parent', async () => {
    const path = await writeVue(
      '<template><div class="flex"><div class="card">a</div><div class="card">b</div><div class="card">c</div></div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a grid without a matching grid-cols count', async () => {
    const path = await writeVue(
      '<template><div class="grid grid-cols-6"><div class="card">a</div><div class="card">b</div><div class="card">c</div></div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag fewer than three cards', async () => {
    const path = await writeVue(
      '<template><div class="grid grid-cols-2"><div class="card">a</div><div class="card">b</div></div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag identical classless cards', async () => {
    const path = await writeVue(
      '<template><div class="grid grid-cols-3"><div>a</div><div>b</div><div>c</div></div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });
});
