import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runScriptPass } from '../src/oxlint/run.js';

// A real .vue that violates the built-in vue/no-import-compiler-macros rule:
// `defineProps` is a compiler macro and must NOT be imported from 'vue'.
const VIOLATING_VUE = [
  '<script setup lang="ts">',
  "import { defineProps } from 'vue';",
  'const p = defineProps<{ x: number }>();',
  '</script>',
  '<template><div>{{ p.x }}</div></template>',
  '',
].join('\n');

async function fixtureDir(): Promise<string> {
  // Copy the fixture into a fresh temp dir — --fix writes to disk, so we must
  // never mutate a committed fixture.
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-fix-e2e-'));
  await writeFile(join(dir, 'Comp.vue'), VIOLATING_VUE);
  return dir;
}

describe('e2e: real oxlint --fix applies fixes to disk', () => {
  it('removes the illegal compiler-macro import when fix is true', async () => {
    const dir = await fixtureDir();
    const file = join(dir, 'Comp.vue');
    const before = await readFile(file, 'utf8');
    expect(before).toContain("import { defineProps } from 'vue'");

    await runScriptPass({
      rootDir: dir,
      targetPath: dir,
      timeoutMs: 60_000,
      fix: true,
    });

    const after = await readFile(file, 'utf8');
    expect(after).not.toContain("import { defineProps } from 'vue'");
    expect(after).toContain('const p = defineProps<{ x: number }>()');
  }, 60_000);

  it('leaves the file untouched when fix is not requested', async () => {
    const dir = await fixtureDir();
    const file = join(dir, 'Comp.vue');
    const before = await readFile(file, 'utf8');

    await runScriptPass({
      rootDir: dir,
      targetPath: dir,
      timeoutMs: 60_000,
    });

    const after = await readFile(file, 'utf8');
    expect(after).toBe(before);
    expect(after).toContain("import { defineProps } from 'vue'");
  }, 60_000);
});
