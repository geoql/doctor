import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type GitScopeMode = 'diff' | 'staged' | 'changed-from';

const SOURCE_EXTENSIONS = ['.vue', '.ts', '.tsx', '.js', '.jsx'];

function isSourceFile(path: string): boolean {
  return SOURCE_EXTENSIONS.some((ext) => path.endsWith(ext));
}

export class GitRefError extends Error {
  constructor(public readonly ref: string) {
    super(`Cannot resolve git ref "${ref}" for --changed-files-from`);
    this.name = 'GitRefError';
  }
}

export interface GitScopeOptions {
  rootDir: string;
  mode: GitScopeMode;
  ref?: string;
  includeUntracked?: boolean;
}

async function gitLines(rootDir: string, args: string[]): Promise<string[]> {
  const { stdout } = await execFileAsync('git', args, { cwd: rootDir });
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

async function untrackedLines(rootDir: string): Promise<string[]> {
  return gitLines(rootDir, ['ls-files', '--others', '--exclude-standard']);
}

async function resolveRef(rootDir: string, ref: string): Promise<void> {
  try {
    await execFileAsync('git', ['rev-parse', '--verify', `${ref}^{commit}`], {
      cwd: rootDir,
    });
  } catch {
    throw new GitRefError(ref);
  }
}

export async function listChangedFiles(
  options: GitScopeOptions,
): Promise<string[]> {
  const { rootDir, mode, ref, includeUntracked } = options;

  // --relative scopes output to rootDir AND emits rootDir-relative paths, so
  // monorepo subdirectory runs resolve correctly (repo-root-relative paths
  // would resolve to nonexistent nested paths). ls-files is already cwd-scoped.
  const relPaths: string[] = [];

  if (mode === 'staged') {
    relPaths.push(
      ...(await gitLines(rootDir, [
        'diff',
        '--name-only',
        '--cached',
        '--relative',
        '--diff-filter=ACMR',
      ])),
    );
    if (includeUntracked) relPaths.push(...(await untrackedLines(rootDir)));
  } else if (mode === 'changed-from') {
    const base = ref ?? 'HEAD';
    await resolveRef(rootDir, base);
    relPaths.push(
      ...(await gitLines(rootDir, [
        'diff',
        '--name-only',
        base,
        '--relative',
        '--diff-filter=ACMR',
      ])),
    );
    if (includeUntracked) relPaths.push(...(await untrackedLines(rootDir)));
  } else {
    // diff mode already unions untracked files, so includeUntracked is a no-op.
    relPaths.push(
      ...(await gitLines(rootDir, [
        'diff',
        '--name-only',
        'HEAD',
        '--relative',
        '--diff-filter=ACMR',
      ])),
    );
    relPaths.push(...(await untrackedLines(rootDir)));
  }

  const absolute = relPaths
    .filter(isSourceFile)
    .map((rel) => resolve(rootDir, rel));
  return [...new Set(absolute)].sort();
}
