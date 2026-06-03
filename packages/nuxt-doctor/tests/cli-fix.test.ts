import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { run } from '../src/cli.js';

const VIOLATING_VUE = [
  '<script setup lang="ts">',
  "import { defineProps } from 'vue';",
  'const p = defineProps<{ x: number }>();',
  '</script>',
  '<template><div>{{ p.x }}</div></template>',
  '',
].join('\n');

describe('nuxt-doctor --fix', () => {
  let stdout: string[];
  let stderr: string[];
  let originalExitCode: typeof process.exitCode;

  beforeEach(() => {
    stdout = [];
    stderr = [];
    originalExitCode = process.exitCode;
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      stdout.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
      stderr.push(String(chunk));
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = originalExitCode;
  });

  it('applies the oxlint fix to disk and prints a summary line', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vue-cli-fix-'));
    const file = join(dir, 'Comp.vue');
    try {
      writeFileSync(file, VIOLATING_VUE);
      await run(['node', 'nuxt-doctor', dir, '--no-dead-code', '--fix']);
      const after = readFileSync(file, 'utf8');
      expect(after).not.toContain("import { defineProps } from 'vue'");
      expect(stderr.join('')).toMatch(/applied oxlint --fix/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  it('reports singular finding correctly in summary line', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'nuxt-cli-fix-singular-'));
    const file = join(dir, 'Single.vue');
    writeFileSync(
      file,
      '<script setup>\nimport { defineProps } from \'vue\'\ndefineProps<{ items: string[] }>()\n</script>\n<template><li v-for="i in items">{{ i }}</li></template>\n',
    );
    try {
      await run(['node', 'nuxt-doctor', dir, '--no-dead-code', '--fix']);
      expect(stderr.join('')).toMatch(/applied oxlint --fix; 1 finding remain/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  it('warns that --fix-exclude is not enforced on oxlint built-ins', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vue-cli-fixexcl-'));
    const file = join(dir, 'Comp.vue');
    try {
      writeFileSync(file, VIOLATING_VUE);
      await run([
        'node',
        'nuxt-doctor',
        dir,
        '--no-dead-code',
        '--fix',
        '--fix-exclude',
        'vue/no-import-compiler-macros',
      ]);
      expect(stderr.join('')).toMatch(/fix-exclude/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  it('SAFETY: --fix combined with --diff does NOT write to disk', async () => {
    const gitDir = mkdtempSync(join(tmpdir(), 'vue-cli-fix-diff-'));
    const sh = (...args: string[]) =>
      execFileSync('git', args, { cwd: gitDir, stdio: 'ignore' });
    const file = join(gitDir, 'Comp.vue');
    try {
      sh('init');
      sh('config', 'user.email', 't@e.com');
      sh('config', 'user.name', 'T');
      writeFileSync(join(gitDir, 'package.json'), '{"name":"x"}\n');
      writeFileSync(file, VIOLATING_VUE);
      sh('add', '.');
      sh('commit', '-m', 'base');
      // Re-touch so the file shows as changed for --diff scoping.
      writeFileSync(file, VIOLATING_VUE);
      const before = readFileSync(file, 'utf8');

      await run([
        'node',
        'nuxt-doctor',
        gitDir,
        '--no-dead-code',
        '--fix',
        '--diff',
      ]);
      const after = readFileSync(file, 'utf8');
      expect(after).toBe(before);
      expect(after).toContain("import { defineProps } from 'vue'");
      expect(stderr.join('')).toMatch(/fix.*(skipped|diff|staged)/i);
    } finally {
      rmSync(gitDir, { recursive: true, force: true });
    }
  }, 60_000);
});
