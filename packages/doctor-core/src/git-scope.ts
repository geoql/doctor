import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type GitScopeMode = 'diff' | 'staged';

const SOURCE_EXTENSIONS = ['.vue', '.ts', '.tsx', '.js', '.jsx'];

function isSourceFile(path: string): boolean {
  return SOURCE_EXTENSIONS.some((ext) => path.endsWith(ext));
}

export interface GitScopeOptions {
  rootDir: string;
  mode: GitScopeMode;
}

async function gitLines(rootDir: string, args: string[]): Promise<string[]> {
  const { stdout } = await execFileAsync('git', args, { cwd: rootDir });
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export async function listChangedFiles(
  options: GitScopeOptions,
): Promise<string[]> {
  const { rootDir, mode } = options;

  // --relative scopes output to rootDir AND emits rootDir-relative paths, so
  // monorepo subdirectory runs resolve correctly (repo-root-relative paths
  // would resolve to nonexistent nested paths). ls-files is already cwd-scoped.
  let relPaths: string[];
  if (mode === 'staged') {
    relPaths = await gitLines(rootDir, [
      'diff',
      '--name-only',
      '--cached',
      '--relative',
      '--diff-filter=ACMR',
    ]);
  } else {
    const tracked = await gitLines(rootDir, [
      'diff',
      '--name-only',
      'HEAD',
      '--relative',
      '--diff-filter=ACMR',
    ]);
    const untracked = await gitLines(rootDir, [
      'ls-files',
      '--others',
      '--exclude-standard',
    ]);
    relPaths = [...tracked, ...untracked];
  }

  const absolute = relPaths
    .filter(isSourceFile)
    .map((rel) => resolve(rootDir, rel));
  return [...new Set(absolute)].sort();
}
