import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcCache, parseSfc } from '../src/template/parse-sfc.js';
import { runTemplatePass } from '../src/template/run.js';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-tmpl-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

beforeEach(() => {
  clearSfcCache();
});

describe('parseSfc', () => {
  it('returns null for an unreadable / non-existent file', async () => {
    expect(await parseSfc('/no/such/file-xyz.vue')).toBeNull();
  });

  it('returns null for an SFC with no template block', async () => {
    const path = await writeVue(
      '<script setup lang="ts">const x = 1;</script>',
    );
    expect(await parseSfc(path)).toBeNull();
  });

  it('returns null for an SFC with parse errors', async () => {
    const path = await writeVue('<template><div></span></template>');
    expect(await parseSfc(path)).toBeNull();
  });

  it('caches results across calls for the same path', async () => {
    const path = await writeVue('<template><div /></template>');
    const first = await parseSfc(path);
    const second = await parseSfc(path);
    expect(first).not.toBeNull();
    expect(second).toBe(first);
  });

  it('returns the cached null on a repeated failed parse', async () => {
    const missing = '/no/such/cached-null-xyz.vue';
    expect(await parseSfc(missing)).toBeNull();
    expect(await parseSfc(missing)).toBeNull();
  });
});

describe('runTemplatePass — v-for-has-key', () => {
  it('flags v-for without a key', async () => {
    const path = await writeVue(
      '<template><li v-for="i in items">{{ i }}</li></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    const keyDiag = diags.find((d) => d.ruleId.includes('v-for-has-key'));
    expect(keyDiag).toBeDefined();
    expect(keyDiag?.severity).toBe('error');
  });

  it('does not flag v-for with a bound :key', async () => {
    const path = await writeVue(
      '<template><li v-for="i in items" :key="i.id">{{ i }}</li></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId.includes('v-for-has-key'))).toBe(false);
  });

  it('does not flag v-for with a static key attribute', async () => {
    const path = await writeVue(
      '<template><li v-for="i in items" key="static">{{ i }}</li></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId.includes('v-for-has-key'))).toBe(false);
  });
});

describe('runTemplatePass — v-if-v-for-precedence', () => {
  it('flags v-if and v-for on the same element', async () => {
    const path = await writeVue(
      '<template><li v-for="i in items" v-if="i.ok" :key="i.id">{{ i }}</li></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId.includes('v-if-v-for-precedence'))).toBe(
      true,
    );
  });
});

describe('runTemplatePass — walking + non-element children', () => {
  it('walks nested elements and ignores interpolation/text nodes', async () => {
    const path = await writeVue(
      '<template><div><span>text {{ value }}</span><ul><li v-for="i in items">{{ i }}</li></ul></div></template>',
    );
    const diags = await runTemplatePass({ files: [path] });
    expect(diags.some((d) => d.ruleId.includes('v-for-has-key'))).toBe(true);
  });
});

describe('runTemplatePass — rule overrides', () => {
  it('skips a rule overridden to off', async () => {
    const path = await writeVue(
      '<template><li v-for="i in items">{{ i }}</li></template>',
    );
    const diags = await runTemplatePass({
      files: [path],
      ruleOverrides: { 'vue-doctor/template/v-for-has-key': 'off' },
    });
    expect(diags.some((d) => d.ruleId.includes('v-for-has-key'))).toBe(false);
  });

  it('rewrites severity when overridden', async () => {
    const path = await writeVue(
      '<template><li v-for="i in items">{{ i }}</li></template>',
    );
    const diags = await runTemplatePass({
      files: [path],
      ruleOverrides: { 'vue-doctor/template/v-for-has-key': 'warn' },
    });
    const keyDiag = diags.find((d) => d.ruleId.includes('v-for-has-key'));
    expect(keyDiag?.severity).toBe('warn');
  });
});

describe('runTemplatePass — file filtering', () => {
  it('skips non-.vue files', async () => {
    const diags = await runTemplatePass({ files: ['/some/file.ts'] });
    expect(diags).toEqual([]);
  });

  it('skips .vue files that fail to parse', async () => {
    const path = await writeVue('<script setup>const x = 1;</script>');
    const diags = await runTemplatePass({ files: [path] });
    expect(diags).toEqual([]);
  });
});
