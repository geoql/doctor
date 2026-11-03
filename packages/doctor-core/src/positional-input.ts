import { statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { listSourceFiles } from './file-scan.js';

const DIR_INCLUDE = ['**/*.vue', '**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
const DIR_EXCLUDE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.nuxt/**',
  '**/.output/**',
  '**/coverage/**',
];

export interface PositionalScanInput {
  /** Project root the audit runs from. */
  readonly rootDir: string;
  /**
   * Absolute files to restrict findings to. `undefined` means "the whole
   * project" (the historical single-`[path]` behavior).
   */
  readonly scopeFiles: string[] | undefined;
}

function kindOf(path: string): 'dir' | 'file' | 'missing' {
  try {
    return statSync(path).isDirectory() ? 'dir' : 'file';
  } catch {
    return 'missing';
  }
}

function isInside(child: string, parent: string): boolean {
  const rel = relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

/**
 * Resolve the positional CLI arguments into a project root plus an optional
 * file scope.
 *
 * - No args → the current directory, whole project.
 * - Exactly one arg that is a directory (or does not exist — the audit then
 *   reports it as before) → that directory is the project root, whole
 *   project. This keeps `vue-doctor <dir>` backward compatible.
 * - Otherwise every arg is a file or directory INSIDE the current directory,
 *   which becomes the project root; findings are restricted to the given
 *   files plus the source files under the given directories.
 */
export async function resolvePositionalScanInput(
  paths: readonly string[],
  cwd: string = process.cwd(),
): Promise<PositionalScanInput> {
  const root = resolve(cwd);
  if (paths.length === 0) return { rootDir: root, scopeFiles: undefined };

  if (paths.length === 1) {
    const only = resolve(root, paths[0]);
    if (kindOf(only) !== 'file') {
      return { rootDir: only, scopeFiles: undefined };
    }
  }

  const scope = new Set<string>();
  for (const entry of paths) {
    const abs = resolve(root, entry);
    const kind = kindOf(abs);
    if (kind === 'missing') {
      throw new Error(`path "${entry}" does not exist.`);
    }
    if (!isInside(abs, root)) {
      throw new Error(
        `path "${entry}" is outside the project root ${root}. Run from a common project root.`,
      );
    }
    if (kind === 'file') {
      scope.add(abs);
      continue;
    }
    const files = await listSourceFiles({
      rootDir: abs,
      include: DIR_INCLUDE,
      exclude: DIR_EXCLUDE,
    });
    for (const file of files) scope.add(file);
  }
  return { rootDir: root, scopeFiles: [...scope].sort() };
}
