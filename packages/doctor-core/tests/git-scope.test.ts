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

  it('resolves staged paths correctly when rootDir is a monorepo subdirectory', async () => {
    const pkg = join(dir, 'apps', 'web');
    mkdirSync(join(pkg, 'src'), { recursive: true });
    writeFileSync(join(pkg, 'src', 'staged.ts'), 'export const d = 4;\n');
    git(dir, 'add', 'apps/web/src/staged.ts');

    const files = await listChangedFiles({ rootDir: pkg, mode: 'staged' });

    expect(files).toEqual([resolve(pkg, 'src/staged.ts')]);
  });

  it('resolves diff paths correctly when rootDir is a monorepo subdirectory', async () => {
    const pkg = join(dir, 'apps', 'web');
    mkdirSync(join(pkg, 'src'), { recursive: true });
    writeFileSync(join(pkg, 'src', 'tracked.ts'), 'export const e = 5;\n');
    git(dir, 'add', 'apps/web/src/tracked.ts');
    git(dir, 'commit', '-m', 'tracked');
    writeFileSync(join(pkg, 'src', 'tracked.ts'), 'export const e = 6;\n');

    const files = await listChangedFiles({ rootDir: pkg, mode: 'diff' });

    expect(files).toEqual([resolve(pkg, 'src/tracked.ts')]);
  });

  it('only lists files under the subdirectory, not sibling packages', async () => {
    const pkg = join(dir, 'apps', 'web');
    mkdirSync(join(pkg, 'src'), { recursive: true });
    writeFileSync(join(pkg, 'src', 'mine.ts'), 'export const f = 7;\n');
    writeFileSync(join(dir, 'src', 'other.ts'), 'export const g = 8;\n');
    git(dir, 'add', '-A');

    const files = await listChangedFiles({ rootDir: pkg, mode: 'staged' });

    expect(files).toEqual([resolve(pkg, 'src/mine.ts')]);
  });

  it('folds non-ignored untracked files into staged mode when includeUntracked', async () => {
    writeFileSync(join(dir, 'src', 'staged.ts'), 'export const h = 9;\n');
    writeFileSync(join(dir, 'src', 'brandnew.ts'), 'export const i = 10;\n');
    git(dir, 'add', 'src/staged.ts');

    const withFlag = await listChangedFiles({
      rootDir: dir,
      mode: 'staged',
      includeUntracked: true,
    });
    expect(withFlag).toEqual([
      resolve(dir, 'src/brandnew.ts'),
      resolve(dir, 'src/staged.ts'),
    ]);

    const withoutFlag = await listChangedFiles({
      rootDir: dir,
      mode: 'staged',
    });
    expect(withoutFlag).toEqual([resolve(dir, 'src/staged.ts')]);
  });

  it('respects gitignore for untracked files in staged mode', async () => {
    writeFileSync(join(dir, '.gitignore'), 'src/generated/\n');
    git(dir, 'add', '.gitignore');
    mkdirSync(join(dir, 'src', 'generated'), { recursive: true });
    writeFileSync(
      join(dir, 'src', 'generated', 'x.ts'),
      'export const j = 1;\n',
    );
    writeFileSync(join(dir, 'src', 'real.ts'), 'export const k = 2;\n');

    const files = await listChangedFiles({
      rootDir: dir,
      mode: 'staged',
      includeUntracked: true,
    });
    expect(files).toEqual([resolve(dir, 'src/real.ts')]);
  });

  it('lists source files changed from an explicit ref in changed-from mode', async () => {
    writeFileSync(join(dir, 'src', 'base.ts'), 'export const l = 1;\n');
    git(dir, 'add', 'src/base.ts');
    git(dir, 'commit', '-m', 'add base');
    const baseRef = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: dir,
    })
      .toString()
      .trim();
    writeFileSync(
      join(dir, 'src', 'feature.vue'),
      '<template><i /></template>\n',
    );
    git(dir, 'add', 'src/feature.vue');
    git(dir, 'commit', '-m', 'add feature');

    const files = await listChangedFiles({
      rootDir: dir,
      mode: 'changed-from',
      ref: baseRef,
    });
    expect(files).toEqual([resolve(dir, 'src/feature.vue')]);
  });

  it('folds untracked files into changed-from mode when includeUntracked', async () => {
    const baseRef = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: dir,
    })
      .toString()
      .trim();
    writeFileSync(join(dir, 'src', 'committed.ts'), 'export const m = 1;\n');
    git(dir, 'add', 'src/committed.ts');
    git(dir, 'commit', '-m', 'committed change');
    writeFileSync(join(dir, 'src', 'untracked.ts'), 'export const n = 2;\n');

    const files = await listChangedFiles({
      rootDir: dir,
      mode: 'changed-from',
      ref: baseRef,
      includeUntracked: true,
    });
    expect(files).toEqual([
      resolve(dir, 'src/committed.ts'),
      resolve(dir, 'src/untracked.ts'),
    ]);
  });

  it('throws GitRefError for an unresolvable ref in changed-from mode', async () => {
    await expect(
      listChangedFiles({
        rootDir: dir,
        mode: 'changed-from',
        ref: 'definitely-not-a-real-ref',
      }),
    ).rejects.toThrowError(/definitely-not-a-real-ref/);
  });

  it('defaults changed-from to HEAD when no ref is given', async () => {
    // src/kept.ts is committed in beforeEach; modifying it makes `git diff HEAD`
    // (the ref default) list it. An untracked file would not appear.
    writeFileSync(join(dir, 'src', 'kept.ts'), 'export const a = 99;\n');

    const files = await listChangedFiles({
      rootDir: dir,
      mode: 'changed-from',
    });
    expect(files).toEqual([resolve(dir, 'src/kept.ts')]);
  });
});
