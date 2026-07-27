import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcCache } from '../src/template/parse-sfc.js';
import { runTemplatePass } from '../src/template/run.js';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-grad-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

const RULE = 'vue-doctor/design/no-gradient-text';

beforeEach(() => {
  clearSfcCache();
});

describe('runTemplatePass — no-gradient-text', () => {
  it('flags bg-clip-text combined with a bg-gradient utility', async () => {
    const path = await writeVue(
      '<template><h1 class="bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">Ship</h1></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    const diag = diags.find((d) => d.ruleId === RULE);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe('warn');
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags the -webkit-background-clip arbitrary variant with bg-linear', async () => {
    const path = await writeVue(
      '<template><span class="[-webkit-background-clip:text] bg-linear-45">X</span></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags an arbitrary bg-[linear-gradient(...)] clip', async () => {
    const path = await writeVue(
      '<template><h2 class="bg-clip-text bg-[linear-gradient(90deg,red,blue)]">X</h2></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('does not flag bg-clip-text without a gradient', async () => {
    const path = await writeVue(
      '<template><h1 class="bg-clip-text text-ink">X</h1></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a gradient background without clip', async () => {
    const path = await writeVue(
      '<template><div class="bg-gradient-to-r from-a to-b">X</div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });
});
