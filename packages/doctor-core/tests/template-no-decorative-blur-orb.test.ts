import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcCache } from '../src/template/parse-sfc.js';
import { runTemplatePass } from '../src/template/run.js';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-orb-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

const RULE = 'vue-doctor/design/no-decorative-blur-orb';

beforeEach(() => {
  clearSfcCache();
});

describe('runTemplatePass — no-decorative-blur-orb', () => {
  it('flags an empty absolute blurred hued div', async () => {
    const path = await writeVue(
      '<template><div class="absolute blur-3xl bg-purple-500" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    const diag = diags.find((d) => d.ruleId === RULE);
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe('warn');
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('flags a div whose only child is whitespace text', async () => {
    const path = await writeVue(
      '<template><div class="absolute blur-2xl bg-pink-400">   </div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('does not flag a non-div tag', async () => {
    const path = await writeVue(
      '<template><span class="absolute blur-3xl bg-purple-500" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a div with real text content', async () => {
    const path = await writeVue(
      '<template><div class="absolute blur-3xl bg-purple-500">Hi</div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a div with an interpolation child', async () => {
    const path = await writeVue(
      '<template><div class="absolute blur-3xl bg-purple-500">{{ x }}</div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag a div with an element child', async () => {
    const path = await writeVue(
      '<template><div class="absolute blur-3xl bg-purple-500"><i /></div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag an orb missing absolute', async () => {
    const path = await writeVue(
      '<template><div class="blur-3xl bg-purple-500" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag an orb missing blur', async () => {
    const path = await writeVue(
      '<template><div class="absolute bg-purple-500" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('does not flag an orb with no hued background', async () => {
    const path = await writeVue(
      '<template><div class="absolute blur-3xl bg-surface" /></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });

  it('still flags an orb whose only child is a comment', async () => {
    const path = await writeVue(
      '<template><div class="absolute blur-3xl bg-purple-500"><!-- spacer --></div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.filter((d) => d.ruleId === RULE)).toHaveLength(1);
  });

  it('does not flag a blurred container that holds an element child', async () => {
    const path = await writeVue(
      '<template><div class="absolute blur-3xl bg-purple-500"><span>real</span></div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId === RULE)).toBe(false);
  });
});
