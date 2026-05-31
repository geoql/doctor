import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Synchronously reports whether `target` exists and is a directory. Missing
 * paths and non-directory entries both return false rather than throwing.
 */
export function directoryExists(target: string): boolean {
  try {
    return statSync(target).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Returns the absolute path of the first existing candidate file (resolved
 * against `dir`), or null when none of the candidates exist.
 */
export function resolveExistingFile(
  dir: string,
  candidates: readonly string[],
): string | null {
  for (const name of candidates) {
    const full = join(dir, name);
    if (existsSync(full)) return full;
  }
  return null;
}
