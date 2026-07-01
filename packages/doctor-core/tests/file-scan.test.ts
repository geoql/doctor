import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listSourceFiles } from '../src/file-scan.js';

async function tmp(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'geoql-doctor-scan-'));
}

describe('listSourceFiles', () => {
  it('globs matching files, returns absolute sorted paths, excludes node_modules', async () => {
    const root = await tmp();
    await writeFile(join(root, 'b.vue'), '<template><div /></template>');
    await writeFile(join(root, 'a.ts'), 'export const x = 1;');
    await mkdir(join(root, 'node_modules', 'pkg'), { recursive: true });
    await writeFile(
      join(root, 'node_modules', 'pkg', 'ignored.ts'),
      'export {};',
    );

    const files = await listSourceFiles({
      rootDir: root,
      include: ['**/*.vue', '**/*.ts'],
      exclude: ['node_modules'],
    });

    expect(files).toEqual([resolve(root, 'a.ts'), resolve(root, 'b.vue')]);
    expect(files.every((f) => f.startsWith('/'))).toBe(true);
    expect(files.some((f) => f.includes('node_modules'))).toBe(false);
  });

  it('excludes NESTED node_modules (monorepo apps/*/node_modules), not just root', async () => {
    const root = await tmp();
    await writeFile(join(root, 'src.ts'), 'export const x = 1;');
    await mkdir(join(root, 'apps', 'docs', 'node_modules', 'dep', 'dist'), {
      recursive: true,
    });
    await writeFile(
      join(root, 'apps', 'docs', 'node_modules', 'dep', 'dist', 'leak.vue'),
      '<template><div /></template>',
    );

    const files = await listSourceFiles({
      rootDir: root,
      include: ['**/*.vue', '**/*.ts'],
      exclude: ['**/node_modules/**'],
    });

    expect(files).toEqual([resolve(root, 'src.ts')]);
    expect(files.some((f) => f.includes('node_modules'))).toBe(false);
  });

  it('returns an empty array when nothing matches', async () => {
    const root = await tmp();
    const files = await listSourceFiles({
      rootDir: root,
      include: ['**/*.vue'],
      exclude: [],
    });
    expect(files).toEqual([]);
  });
});
