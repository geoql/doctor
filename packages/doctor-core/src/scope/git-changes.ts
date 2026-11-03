import { execFile } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/** One `@@ -oldStart,oldCount +newStart,newCount @@` hunk (1-based lines). */
export interface Hunk {
  readonly oldStart: number;
  readonly oldCount: number;
  readonly newStart: number;
  readonly newCount: number;
}

export interface FileChange {
  /** rootDir-relative POSIX path in the working tree (head side). */
  readonly path: string;
  /** rootDir-relative path on the base side; `null` for added files. */
  readonly oldPath: string | null;
  readonly status: 'added' | 'modified' | 'renamed';
  readonly hunks: readonly Hunk[];
}

export interface ChangeSetOptions {
  readonly rootDir: string;
  /** Diff against this revision (working tree vs ref). Omit for `HEAD`. */
  readonly ref?: string;
  /** Compare the index against HEAD instead of the working tree. */
  readonly cached?: boolean;
  /** Fold non-ignored untracked files in as whole-file additions. */
  readonly includeUntracked?: boolean;
}

const GIT_DIFF_ARGS = [
  '-c',
  'core.quotePath=false',
  'diff',
  '--no-ext-diff',
  '--no-color',
  '--no-textconv',
  '--unified=0',
  '--find-renames',
  '--relative',
];

function unquote(path: string): string {
  if (!path.startsWith('"')) return path;
  try {
    return JSON.parse(path) as string;
  } catch {
    return path.slice(1, -1);
  }
}

function stripPrefix(path: string): string {
  const raw = unquote(path);
  return raw.startsWith('a/') || raw.startsWith('b/') ? raw.slice(2) : raw;
}

const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

/**
 * Parse `git diff --unified=0 --find-renames` output into per-file changes.
 * Deleted files (`+++ /dev/null`) are dropped: they have no head-side lines.
 */
export function parseUnifiedDiff(stdout: string): FileChange[] {
  const out: FileChange[] = [];
  let current:
    | { oldPath: string | null; path: string | null; hunks: Hunk[] }
    | undefined;
  const flush = (): void => {
    if (current?.path) {
      out.push({
        path: current.path,
        oldPath: current.oldPath,
        status:
          current.oldPath === null
            ? 'added'
            : current.oldPath === current.path
              ? 'modified'
              : 'renamed',
        hunks: current.hunks,
      });
    }
  };
  for (const line of stdout.split('\n')) {
    if (line.startsWith('diff --git ')) {
      flush();
      current = { oldPath: null, path: null, hunks: [] };
      continue;
    }
    if (!current) continue;
    if (line.startsWith('rename from ')) {
      current.oldPath = unquote(line.slice('rename from '.length));
    } else if (line.startsWith('rename to ')) {
      current.path = unquote(line.slice('rename to '.length));
    } else if (line.startsWith('--- ')) {
      const p = line.slice(4);
      if (p !== '/dev/null') current.oldPath = stripPrefix(p);
    } else if (line.startsWith('+++ ')) {
      const p = line.slice(4);
      current.path = p === '/dev/null' ? null : stripPrefix(p);
    } else {
      const m = HUNK_HEADER.exec(line);
      if (m) {
        current.hunks.push({
          oldStart: Number(m[1]),
          oldCount: m[2] === undefined ? 1 : Number(m[2]),
          newStart: Number(m[3]),
          newCount: m[4] === undefined ? 1 : Number(m[4]),
        });
      }
    }
  }
  flush();
  return out;
}

/**
 * Map a base-revision line onto the head revision using a file's hunks. Lines
 * inside a changed region map to the start of that region.
 */
export function mapLineThroughHunks(
  hunks: readonly Hunk[],
  line: number,
): number {
  let delta = 0;
  for (const h of hunks) {
    if (h.oldCount === 0) {
      if (line > h.oldStart) delta += h.newCount;
      continue;
    }
    if (line < h.oldStart) break;
    if (line <= h.oldStart + h.oldCount - 1) return Math.max(1, h.newStart);
    delta += h.newCount - h.oldCount;
  }
  return line + delta;
}

async function git(
  rootDir: string,
  args: readonly string[],
  env?: NodeJS.ProcessEnv,
): Promise<string> {
  const { stdout } = await execFileAsync('git', [...args], {
    cwd: rootDir,
    maxBuffer: 256 * 1024 * 1024,
    ...(env ? { env: { ...process.env, ...env } } : {}),
  });
  return stdout;
}

async function listUntracked(rootDir: string): Promise<string[]> {
  const stdout = await git(rootDir, [
    'ls-files',
    '--others',
    '--exclude-standard',
    '-z',
  ]);
  return stdout.split('\0').filter((p) => p.length > 0);
}

async function wholeFileAddition(
  rootDir: string,
  path: string,
): Promise<FileChange> {
  let lineCount = 1;
  try {
    const content = await readFile(resolve(rootDir, path), 'utf-8');
    lineCount = Math.max(1, content.replace(/\n$/, '').split('\n').length);
  } catch {
    // unreadable — keep a one-line range so the file still counts as changed
  }
  return {
    path,
    oldPath: null,
    status: 'added',
    hunks: [{ oldStart: 0, oldCount: 0, newStart: 1, newCount: lineCount }],
  };
}

/**
 * Diff the working tree against `ref` with untracked files registered as
 * intent-to-add in a throwaway index copy. That single diff yields both their
 * whole-file hunks AND rename pairing — so a tracked file that was deleted and
 * recreated as an untracked file under a new name is reported as a rename.
 */
async function diffWithIntentToAdd(
  rootDir: string,
  ref: string,
  untracked: readonly string[],
): Promise<FileChange[] | null> {
  const temp = mkdtempSync(join(tmpdir(), 'doctor-index-'));
  try {
    const indexPath = (
      await git(rootDir, [
        'rev-parse',
        '--path-format=absolute',
        '--git-path',
        'index',
      ])
    ).trim();
    const indexFile = join(temp, 'index');
    const pathspecFile = join(temp, 'untracked');
    copyFileSync(indexPath, indexFile);
    writeFileSync(pathspecFile, untracked.join('\0'));
    const env = { GIT_INDEX_FILE: indexFile };
    await git(
      rootDir,
      [
        '-c',
        'core.splitIndex=false',
        '--literal-pathspecs',
        'add',
        '--intent-to-add',
        `--pathspec-from-file=${pathspecFile}`,
        '--pathspec-file-nul',
      ],
      env,
    );
    return parseUnifiedDiff(await git(rootDir, [...GIT_DIFF_ARGS, ref], env));
  } catch {
    return null;
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

/** `git rev-parse HEAD` for `rootDir`, or `undefined` outside a git checkout. */
export async function readSourceRevision(
  rootDir: string,
): Promise<string | undefined> {
  try {
    return (await git(rootDir, ['rev-parse', '--verify', 'HEAD'])).trim();
  } catch {
    return undefined;
  }
}

/**
 * Collect the changed files (with hunks) between `ref` and the working tree,
 * or between HEAD and the index when `cached` is set. Paths are relative to
 * `rootDir` (`--relative`), so monorepo subdirectory runs stay scoped.
 */
export async function readChangeSet(
  options: ChangeSetOptions,
): Promise<FileChange[]> {
  const { rootDir, cached, includeUntracked } = options;
  const ref = options.ref ?? 'HEAD';
  const untracked = includeUntracked ? await listUntracked(rootDir) : [];
  if (!cached && untracked.length > 0) {
    const combined = await diffWithIntentToAdd(rootDir, ref, untracked);
    if (combined) return combined;
  }
  const changes = parseUnifiedDiff(
    await git(rootDir, [...GIT_DIFF_ARGS, ...(cached ? ['--cached'] : [ref])]),
  );
  // Untracked paths are by definition absent from a cached / plain diff.
  for (const path of untracked) {
    changes.push(await wholeFileAddition(rootDir, path));
  }
  return changes;
}
