import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { resolvePositionalScanInput } from '../src/positional-input.js';

describe('resolvePositionalScanInput', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'doctor-positional-'));
    mkdirSync(join(root, 'src', 'deep'), { recursive: true });
    mkdirSync(join(root, 'src', 'node_modules'), { recursive: true });
    writeFileSync(join(root, 'src', 'a.vue'), '<template />');
    writeFileSync(join(root, 'src', 'b.ts'), 'export {};');
    writeFileSync(join(root, 'src', 'deep', 'c.ts'), 'export {};');
    writeFileSync(join(root, 'src', 'node_modules', 'x.ts'), '');
    writeFileSync(join(root, 'README.md'), '# hi');
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('defaults to cwd with no scope', async () => {
    expect(await resolvePositionalScanInput([], root)).toEqual({
      rootDir: root,
      scopeFiles: undefined,
    });
  });

  it('treats a single directory as the project root (backward compatible)', async () => {
    expect(await resolvePositionalScanInput(['src'], root)).toEqual({
      rootDir: join(root, 'src'),
      scopeFiles: undefined,
    });
  });

  it('treats a single missing path as a project root too', async () => {
    expect(await resolvePositionalScanInput(['nope'], root)).toEqual({
      rootDir: join(root, 'nope'),
      scopeFiles: undefined,
    });
  });

  it('scopes to a single file', async () => {
    expect(await resolvePositionalScanInput(['src/a.vue'], root)).toEqual({
      rootDir: root,
      scopeFiles: [join(root, 'src', 'a.vue')],
    });
  });

  it('scopes to several files and expands directories, de-duplicated', async () => {
    const result = await resolvePositionalScanInput(
      ['src/b.ts', 'src/deep', 'src/b.ts', 'README.md'],
      root,
    );
    expect(result.rootDir).toBe(root);
    expect(result.scopeFiles).toEqual([
      join(root, 'README.md'),
      join(root, 'src', 'b.ts'),
      join(root, 'src', 'deep', 'c.ts'),
    ]);
  });

  it('skips node_modules when expanding a directory', async () => {
    const result = await resolvePositionalScanInput(['src', 'README.md'], root);
    expect(result.scopeFiles).not.toContain(
      join(root, 'src', 'node_modules', 'x.ts'),
    );
    expect(result.scopeFiles).toContain(join(root, 'src', 'a.vue'));
  });

  it('rejects a missing path in multi-path mode', async () => {
    await expect(
      resolvePositionalScanInput(['src/a.vue', 'gone.ts'], root),
    ).rejects.toThrow('path "gone.ts" does not exist.');
  });

  it('rejects paths outside the project root', async () => {
    const outside = mkdtempSync(join(tmpdir(), 'doctor-outside-'));
    writeFileSync(join(outside, 'o.ts'), '');
    try {
      await expect(
        resolvePositionalScanInput([join(outside, 'o.ts')], root),
      ).rejects.toThrow(/is outside the project root/);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it('uses process.cwd() by default', async () => {
    const result = await resolvePositionalScanInput([]);
    expect(result.rootDir).toBe(process.cwd());
  });
});
