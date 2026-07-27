import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcCache } from '../src/template/parse-sfc.js';
import { runTemplatePass } from '../src/template/run.js';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-halo-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

const RULE = 'vue-doctor/design/no-radial-halo';

beforeEach(() => {
  clearSfcCache();
});

describe('runTemplatePass — no-radial-halo', () => {
  it('flags an absolute blurred radial-gradient halo', async () => {
    const path = await writeVue(
      '<template><div class="absolute blur-3xl bg-[radial-gradient(circle,#fff,transparent)]" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    const diag = diags.find((d) => d.ruleId === RULE);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe('warn');
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('does not flag a radial halo missing absolute', async () => {
    const path = await writeVue(
      '<template><div class="blur-3xl bg-[radial-gradient(circle,#fff,transparent)]" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag an absolute blur without a radial gradient', async () => {
    const path = await writeVue(
      '<template><div class="absolute blur-3xl bg-surface" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag an absolute radial gradient without blur', async () => {
    const path = await writeVue(
      '<template><div class="absolute bg-[radial-gradient(circle,#fff,transparent)]" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });
});
