import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcCache } from '../src/template/parse-sfc.js';
import { runTemplatePass } from '../src/template/run.js';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-black-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

const RULE = 'vue-doctor/design/no-pure-black-background';

beforeEach(() => {
  clearSfcCache();
});

describe('runTemplatePass — no-pure-black-background', () => {
  it('flags bg-black on a full-height container', async () => {
    const path = await writeVue(
      '<template><div class="min-h-screen bg-black">X</div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    const diag = diags.find((d) => d.ruleId === RULE);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe('warn');
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags bg-[#000] on a main element', async () => {
    const path = await writeVue(
      '<template><main class="bg-[#000]">X</main></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags bg-[#000000] on an h-dvh container', async () => {
    const path = await writeVue(
      '<template><section class="h-dvh bg-[#000000]">X</section></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags an inline black background style on a root tag', async () => {
    const path = await writeVue(
      '<template><body style="background: #000;">X</body></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags inline background-color: black on a full-height element', async () => {
    const path = await writeVue(
      '<template><div class="h-screen" style="background-color: black;">X</div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('does not flag bg-black on a non-root, non-full-height element', async () => {
    const path = await writeVue(
      '<template><span class="bg-black">X</span></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a full-height container with a token background', async () => {
    const path = await writeVue(
      '<template><div class="min-h-screen bg-ink">X</div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a non-black inline style on a root tag', async () => {
    const path = await writeVue(
      '<template><main style="background: #123456;">X</main></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });
});
