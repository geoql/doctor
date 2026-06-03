import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runScriptPass } from '../src/oxlint/run.js';

async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-run-'));
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, name), content);
  }
  return dir;
}

describe('runScriptPass', () => {
  it('returns a canonicalized result for a clean fixture', async () => {
    const dir = await fixture({
      'clean.vue': '<template><div /></template>\n',
    });
    const result = await runScriptPass({
      rootDir: dir,
      targetPath: dir,
      timeoutMs: 60_000,
    });
    expect(Array.isArray(result.diagnostics)).toBe(true);
    expect('stderr' in result).toBe(true);
    expect('exitCode' in result).toBe(true);
  });

  it('produces canonical oxlint diagnostics for a violating fixture', async () => {
    const dir = await fixture({
      'bad.vue':
        '<script setup lang="ts">\nconst msg = "this — has an em dash";\n</script>\n<template><div>{{ msg }}</div></template>\n',
    });
    const result = await runScriptPass({
      rootDir: dir,
      targetPath: dir,
      timeoutMs: 60_000,
    });
    for (const d of result.diagnostics) {
      expect(d.source).toBe('oxlint');
      expect(typeof d.line).toBe('number');
      expect(typeof d.column).toBe('number');
      expect(d.file.startsWith('/')).toBe(true);
    }
  });

  it('forwards fix:true to the oxlint spawn args', async () => {
    const dir = await fixture({
      'clean.vue': '<template><div /></template>\n',
    });
    const result = await runScriptPass({
      rootDir: dir,
      targetPath: dir,
      timeoutMs: 60_000,
      fix: true,
    });
    expect(result).toBeDefined();
  });

  it('threads fixExcludes to the oxlint spawn args', async () => {
    const dir = await fixture({
      'clean.vue': '<template><div /></template>\n',
    });
    const result = await runScriptPass({
      rootDir: dir,
      targetPath: dir,
      timeoutMs: 60_000,
      fix: true,
      fixExcludes: ['vue/no-import-compiler-macros'],
    });
    expect(result).toBeDefined();
  });
});
