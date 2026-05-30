import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { listChangedFiles } from '../src/git-scope.js';

function git(cwd: string, ...args: string[]): void {
  execFileSync('git', args, { cwd, stdio: 'ignore' });
}

describe('listChangedFiles', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'git-scope-'));
    git(dir, 'init');
    git(dir, 'config', 'user.email', 'test@example.com');
    git(dir, 'config', 'user.name', 'Test');
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(join(dir, 'src', 'kept.ts'), 'export const a = 1;\n');
    writeFileSync(join(dir, 'README.md'), '# base\n');
    git(dir, 'add', '.');
    git(dir, 'commit', '-m', 'base');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('lists working-tree source files changed vs HEAD in diff mode', async () => {
    writeFileSync(
      join(dir, 'src', 'changed.vue'),
      '<template><div /></template>\n',
    );
    writeFileSync(join(dir, 'docs.md'), 'ignored\n');

    const files = await listChangedFiles({ rootDir: dir, mode: 'diff' });

    expect(files).toEqual([resolve(dir, 'src/changed.vue')]);
  });

  it('lists only staged source files in staged mode', async () => {
    writeFileSync(join(dir, 'src', 'staged.ts'), 'export const b = 2;\n');
    writeFileSync(join(dir, 'src', 'unstaged.ts'), 'export const c = 3;\n');
    git(dir, 'add', 'src/staged.ts');

    const files = await listChangedFiles({ rootDir: dir, mode: 'staged' });

    expect(files).toEqual([resolve(dir, 'src/staged.ts')]);
  });

  it('returns an empty list when nothing changed', async () => {
    expect(await listChangedFiles({ rootDir: dir, mode: 'diff' })).toEqual([]);
  });

  it('excludes non-source extensions', async () => {
    writeFileSync(join(dir, 'notes.md'), 'changed\n');
    writeFileSync(join(dir, 'data.json'), '{}\n');

    expect(await listChangedFiles({ rootDir: dir, mode: 'diff' })).toEqual([]);
  });
});
