import { isAbsolute, relative, resolve, sep } from 'node:path';
import {
  listWorkspacePackages,
  type WorkspacePackage,
} from './list-workspace-packages.js';

export interface NestedWorkspaceExclusion {
  /** Workspace packages strictly below the scanned dir that were excluded. */
  readonly excluded: WorkspacePackage[];
  /** Exclude globs (relative to the scanned dir) for the excluded packages. */
  readonly globs: string[];
}

function relativeInside(child: string, parent: string): string | null {
  const rel = relative(parent, child);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) return null;
  return rel.split(sep).join('/');
}

/**
 * Workspace packages are their own projects: each has its own package.json,
 * framework, and doctor config. Scanning an ancestor directory must not judge
 * a nested package's files against the ancestor's settings, so every pnpm
 * workspace package strictly below `rootDir` is excluded from that scan.
 *
 * A package is kept (explicitly selected) when one of `selectedFiles` lives
 * inside it — e.g. `vue-doctor packages/a/App.vue` run from the repo root.
 * Packages selected with `--project` are audited by their own scan, so they
 * stay excluded from any ancestor scan and are never counted twice.
 */
export async function findNestedWorkspaceExclusion(
  rootDir: string,
  selectedFiles: readonly string[] = [],
): Promise<NestedWorkspaceExclusion> {
  const root = resolve(rootDir);
  const packages = await listWorkspacePackages(root);
  const excluded: WorkspacePackage[] = [];
  const globs: string[] = [];
  for (const pkg of packages) {
    const rel = relativeInside(resolve(pkg.dir), root);
    if (rel === null) continue;
    const selected = selectedFiles.some(
      (file) => relativeInside(resolve(file), resolve(pkg.dir)) !== null,
    );
    if (selected) continue;
    excluded.push(pkg);
    globs.push(`${rel}/**`);
  }
  return { excluded, globs };
}
