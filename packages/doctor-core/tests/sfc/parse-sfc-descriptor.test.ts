import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearSfcDescriptorCache,
  parseSfcDescriptor,
} from '../../src/sfc/parse-sfc-descriptor.js';

let counter = 0;

async function writeVue(content: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-sfc-desc-'));
  const path = join(dir, `Comp${counter++}.vue`);
  await writeFile(path, content);
  return path;
}

beforeEach(() => {
  clearSfcDescriptorCache();
});

describe('parseSfcDescriptor', () => {
  it('returns null for an unreadable / non-existent file', async () => {
    expect(await parseSfcDescriptor('/no/such/file-xyz.vue')).toBeNull();
  });

  it('returns null for a malformed SFC', async () => {
    const path = await writeVue('<template><div></span></template>');
    expect(await parseSfcDescriptor(path)).toBeNull();
  });

  it('returns the descriptor for a template-less script-setup + script SFC', async () => {
    const path = await writeVue(
      '<script setup lang="ts">const x = 1;</script>\n<script lang="ts">export default { name: "Foo" };</script>',
    );
    const descriptor = await parseSfcDescriptor(path);
    expect(descriptor).not.toBeNull();
    expect(descriptor?.scriptSetup).not.toBeNull();
    expect(descriptor?.script).not.toBeNull();
  });

  it('caches results across calls for the same path', async () => {
    const path = await writeVue('<script setup>const x = 1;</script>');
    const first = await parseSfcDescriptor(path);
    const second = await parseSfcDescriptor(path);
    expect(first).not.toBeNull();
    expect(second).toBe(first);
  });

  it('returns the cached null on a repeated failed parse', async () => {
    const missing = '/no/such/cached-null-desc-xyz.vue';
    expect(await parseSfcDescriptor(missing)).toBeNull();
    expect(await parseSfcDescriptor(missing)).toBeNull();
  });
});
