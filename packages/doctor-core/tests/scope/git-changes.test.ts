import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  chmodSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  mapLineThroughHunks,
  parseUnifiedDiff,
  readChangeSet,
  readSourceRevision,
} from '../../src/scope/git-changes.js';

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf-8' });
}

const body = (n: number, tag = 'line'): string =>
  Array.from({ length: n }, (_, i) => `export const ${tag}${i} = ${i};`).join(
    '\n',
  ) + '\n';

describe('parseUnifiedDiff', () => {
  it('parses adds, modifications, renames, quoted paths, and drops deletions', () => {
    const out = parseUnifiedDiff(
      [
        'diff --git a/src/a.ts b/src/a.ts',
        'index 1..2 100644',
        '--- a/src/a.ts',
        '+++ b/src/a.ts',
        '@@ -3 +3,2 @@ ctx',
        '-old',
        '+new',
        '+new2',
        '@@ -10,2 +11,0 @@',
        'diff --git a/old.ts b/new.ts',
        'similarity index 90%',
        'rename from old.ts',
        'rename to new.ts',
        'diff --git a/gone.ts b/gone.ts',
        'deleted file mode 100644',
        '--- a/gone.ts',
        '+++ /dev/null',
        '@@ -1 +0,0 @@',
        'diff --git "a/sp ace.ts" "b/sp ace.ts"',
        'new file mode 100644',
        '--- /dev/null',
        '+++ "b/sp ace.ts"',
        '@@ -0,0 +1 @@',
        'diff --git "a/bad.ts" "b/bad.ts"',
        '--- "a/bad\\q.ts"',
        '+++ "b/bad\\q.ts"',
        'stray line before nothing',
        'diff --git plain.ts plain.ts',
        '--- plain.ts',
        '+++ plain.ts',
      ].join('\n'),
    );
    expect(out).toEqual([
      {
        path: 'src/a.ts',
        oldPath: 'src/a.ts',
        status: 'modified',
        hunks: [
          { oldStart: 3, oldCount: 1, newStart: 3, newCount: 2 },
          { oldStart: 10, oldCount: 2, newStart: 11, newCount: 0 },
        ],
      },
      { path: 'new.ts', oldPath: 'old.ts', status: 'renamed', hunks: [] },
      {
        path: 'sp ace.ts',
        oldPath: null,
        status: 'added',
        hunks: [{ oldStart: 0, oldCount: 0, newStart: 1, newCount: 1 }],
      },
      {
        path: 'bad\\q.ts',
        oldPath: 'bad\\q.ts',
        status: 'modified',
        hunks: [],
      },
      { path: 'plain.ts', oldPath: 'plain.ts', status: 'modified', hunks: [] },
    ]);
    expect(parseUnifiedDiff('noise before any header\n')).toEqual([]);
  });
});

describe('mapLineThroughHunks', () => {
  const hunks = [
    { oldStart: 2, oldCount: 0, newStart: 3, newCount: 2 }, // +2 after old 2
    { oldStart: 5, oldCount: 2, newStart: 8, newCount: 1 }, // 2 → 1
    { oldStart: 10, oldCount: 1, newStart: 0, newCount: 0 }, // deletion
  ];
  it('shifts lines below insertions and replacements', () => {
    expect(mapLineThroughHunks(hunks, 1)).toBe(1);
    expect(mapLineThroughHunks(hunks, 2)).toBe(2);
    expect(mapLineThroughHunks(hunks, 4)).toBe(6);
    expect(mapLineThroughHunks(hunks, 6)).toBe(8);
    expect(mapLineThroughHunks(hunks, 9)).toBe(10);
    expect(mapLineThroughHunks(hunks, 10)).toBe(1);
    expect(mapLineThroughHunks(hunks, 20)).toBe(20);
  });
});

describe('readChangeSet', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'git-changes-'));
    git(dir, 'init', '-q');
    git(dir, 'config', 'user.email', 't@e.com');
    git(dir, 'config', 'user.name', 'T');
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src', 'a.ts'), body(5));
    writeFileSync(join(dir, 'src', 'moved.ts'), body(12, 'moved'));
    git(dir, 'add', '.');
    git(dir, 'commit', '-qm', 'base');
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('reads working-tree hunks vs HEAD', async () => {
    writeFileSync(join(dir, 'src', 'a.ts'), body(5).replace('= 2;', '= 22;'));
    const changes = await readChangeSet({ rootDir: dir });
    expect(changes).toEqual([
      {
        path: 'src/a.ts',
        oldPath: 'src/a.ts',
        status: 'modified',
        hunks: [{ oldStart: 3, oldCount: 1, newStart: 3, newCount: 1 }],
      },
    ]);
  });

  it('treats a deleted tracked file recreated untracked under a new name as a rename', async () => {
    renameSync(join(dir, 'src', 'moved.ts'), join(dir, 'src', 'renamed.ts'));
    writeFileSync(join(dir, 'src', 'fresh.ts'), 'a\nb\n');
    const changes = await readChangeSet({
      rootDir: dir,
      ref: 'HEAD',
      includeUntracked: true,
    });
    const byPath = new Map(changes.map((c) => [c.path, c]));
    expect(byPath.get('src/renamed.ts')).toMatchObject({
      oldPath: 'src/moved.ts',
      status: 'renamed',
    });
    expect(byPath.get('src/fresh.ts')).toMatchObject({
      status: 'added',
      hunks: [{ oldStart: 0, oldCount: 0, newStart: 1, newCount: 2 }],
    });
  });

  it('falls back to whole-file additions when the temp index cannot be built', async () => {
    writeFileSync(join(dir, 'src', 'u.ts'), 'one\ntwo\nthree');
    rmSync(join(dir, '.git', 'index'));
    const changes = await readChangeSet({
      rootDir: dir,
      includeUntracked: true,
    });
    const fresh = changes.find((c) => c.path === 'src/u.ts');
    expect(fresh).toBeDefined();
  });

  it('compares the index against HEAD with cached and folds untracked files', async () => {
    writeFileSync(join(dir, 'src', 'a.ts'), body(6));
    git(dir, 'add', 'src/a.ts');
    writeFileSync(join(dir, 'src', 'u.ts'), 'x\n');
    const changes = await readChangeSet({
      rootDir: dir,
      cached: true,
      includeUntracked: true,
    });
    expect(changes.map((c) => c.path).sort()).toEqual(['src/a.ts', 'src/u.ts']);
    expect(changes.find((c) => c.path === 'src/u.ts')!.hunks).toEqual([
      { oldStart: 0, oldCount: 0, newStart: 1, newCount: 1 },
    ]);
  });

  it('keeps a one-line range for an unreadable untracked file', async () => {
    const locked = join(dir, 'src', 'locked.ts');
    writeFileSync(locked, 'x\ny\nz\n');
    chmodSync(locked, 0o000);
    try {
      const changes = await readChangeSet({
        rootDir: dir,
        cached: true,
        includeUntracked: true,
      });
      const entry = changes.find((c) => c.path === 'src/locked.ts');
      expect(entry!.hunks[0]!.newCount).toBe(1);
    } finally {
      chmodSync(locked, 0o644);
    }
  });

  it('reads the source revision, or undefined outside git', async () => {
    expect(await readSourceRevision(dir)).toMatch(/^[0-9a-f]{40}$/);
    const plain = mkdtempSync(join(tmpdir(), 'no-git-'));
    try {
      expect(await readSourceRevision(plain)).toBeUndefined();
    } finally {
      rmSync(plain, { recursive: true, force: true });
    }
  });
});
