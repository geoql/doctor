import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import type { ScopeMode } from '../types.js';
import { readChangeSet, type FileChange } from './git-changes.js';

const execFileAsync = promisify(execFile);

export const SCOPE_MODES: readonly ScopeMode[] = [
  'full',
  'files',
  'changed',
  'lines',
  'contextual',
];

export function isScopeMode(value: unknown): value is ScopeMode {
  return SCOPE_MODES.includes(value as ScopeMode);
}

export class ScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScopeError';
  }
}

/** The deprecated pre-`--scope` flags, kept working as exact aliases. */
export type LegacyScopeFlag = 'diff' | 'staged' | 'changed-files-from';

export interface ScopeRequest {
  readonly mode: ScopeMode;
  /** Base ref; defaults to the merge-base with the default / PR base branch. */
  readonly base?: string;
  /** Use the git index (staged changes vs HEAD) as the change set. */
  readonly staged?: boolean;
  readonly includeUntracked?: boolean;
  /** Set when the request came from a deprecated alias flag. */
  readonly legacy?: LegacyScopeFlag;
}

export interface ScopePlan {
  readonly mode: Exclude<ScopeMode, 'full'>;
  /** The ref as requested or detected (e.g. `origin/main`); absent for staged. */
  readonly base?: string;
  /** Revision the change set was diffed against (merge-base sha or `HEAD`). */
  readonly diffBase: string;
  /** Changed source files with their hunks (rootDir-relative paths). */
  readonly changes: readonly FileChange[];
  /** Absolute paths of the changed source files. */
  readonly files: readonly string[];
}

const SOURCE_EXTENSIONS = ['.vue', '.ts', '.tsx', '.js', '.jsx'];

function isSourceFile(path: string): boolean {
  return SOURCE_EXTENSIONS.some((ext) => path.endsWith(ext));
}

async function git(rootDir: string, args: readonly string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', [...args], { cwd: rootDir });
  return stdout.trim();
}

async function refExists(rootDir: string, ref: string): Promise<boolean> {
  try {
    await git(rootDir, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

/** A ref that cannot be smuggled into git argv as an option. */
function isSafeRef(ref: string): boolean {
  return ref.length > 0 && !ref.startsWith('-');
}

/**
 * The branch a change should be compared against: the PR base on CI
 * (`GITHUB_BASE_REF`), else `origin/HEAD`, else a local `main` / `master`
 * (preferring its `origin/` counterpart when present).
 */
export async function detectDefaultBase(
  rootDir: string,
): Promise<string | null> {
  const candidates: string[] = [];
  const prBase = process.env.GITHUB_BASE_REF;
  if (prBase) candidates.push(`origin/${prBase}`, prBase);
  try {
    const symref = await git(rootDir, [
      'symbolic-ref',
      '--quiet',
      'refs/remotes/origin/HEAD',
    ]);
    candidates.push(symref.replace('refs/remotes/', ''));
  } catch {
    // no origin/HEAD — fall through to conventional branch names
  }
  candidates.push('origin/main', 'main', 'origin/master', 'master');
  for (const candidate of candidates) {
    if (await refExists(rootDir, candidate)) return candidate;
  }
  return null;
}

/**
 * Resolve a `--scope` request into a concrete change set. Returns `null` for
 * `full` (nothing to compute). Throws {@link ScopeError} for an unresolvable
 * base so the CLI exits 2 instead of silently scanning nothing.
 */
export async function resolveScopePlan(
  rootDir: string,
  request: ScopeRequest,
): Promise<ScopePlan | null> {
  if (request.mode === 'full') return null;
  const mode = request.mode;
  let base: string | undefined;
  let diffBase: string;
  let cached = false;
  let includeUntracked = request.includeUntracked === true;

  if (request.staged) {
    cached = true;
    diffBase = 'HEAD';
  } else if (request.legacy === 'diff') {
    // --diff: working tree vs HEAD, always folding untracked files.
    base = 'HEAD';
    diffBase = 'HEAD';
    includeUntracked = true;
  } else {
    const flagName =
      request.legacy === 'changed-files-from'
        ? '--changed-files-from'
        : '--base';
    if (request.base !== undefined) {
      if (
        !isSafeRef(request.base) ||
        !(await refExists(rootDir, request.base))
      ) {
        throw new ScopeError(
          `Cannot resolve git ref "${request.base}" for ${flagName}`,
        );
      }
      base = request.base;
    } else {
      const detected = await detectDefaultBase(rootDir);
      if (detected === null) {
        throw new ScopeError(
          `Cannot detect a default branch to compare against for --scope ${mode}; pass --base <ref>.`,
        );
      }
      base = detected;
    }
    if (request.legacy === 'changed-files-from') {
      // Historical semantics: diff directly against <ref>, no merge-base.
      diffBase = base;
    } else {
      try {
        diffBase = await git(rootDir, ['merge-base', base, 'HEAD']);
      } catch {
        throw new ScopeError(
          `No merge-base between "${base}" and HEAD; pass a related --base <ref>.`,
        );
      }
    }
  }

  const changes = (
    await readChangeSet({
      rootDir,
      ref: diffBase,
      cached,
      includeUntracked,
    })
  ).filter((change) => isSourceFile(change.path));
  const files = [
    ...new Set(changes.map((change) => resolve(rootDir, change.path))),
  ].sort();
  return {
    mode,
    ...(base !== undefined ? { base } : {}),
    diffBase,
    changes,
    files,
  };
}
