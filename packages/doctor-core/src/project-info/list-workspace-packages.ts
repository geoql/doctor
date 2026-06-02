import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { glob } from 'tinyglobby';
import { findMonorepoRoot } from './find-monorepo-root.js';
import { readPackageJson } from './read-package-json.js';

export interface WorkspacePackage {
  name: string;
  dir: string;
}

function parsePackageGlobs(yaml: string): string[] {
  const globs: string[] = [];
  let inPackages = false;
  for (const raw of yaml.split('\n')) {
    if (!inPackages) {
      if (/^packages:/.test(raw)) inPackages = true;
      continue;
    }
    const item = raw.match(/^\s*-\s*(.+?)\s*$/);
    if (item) {
      globs.push(item[1].replace(/^['"]|['"]$/g, ''));
      continue;
    }
    if (raw.trim() === '') continue;
    break;
  }
  return globs;
}

export async function listWorkspacePackages(
  rootDir: string,
): Promise<WorkspacePackage[]> {
  const { root, kind } = await findMonorepoRoot(rootDir);
  if (kind !== 'pnpm') return [];

  const yaml = await readFile(join(root, 'pnpm-workspace.yaml'), 'utf8');
  const globs = parsePackageGlobs(yaml);
  const manifests = await glob(
    globs.map((g) => `${g}/package.json`),
    { cwd: root, absolute: true, onlyFiles: true, dot: false },
  );

  const packages: WorkspacePackage[] = [];
  for (const manifest of manifests) {
    const dir = dirname(manifest);
    const pkg = await readPackageJson(dir);
    if (pkg?.name) packages.push({ name: pkg.name, dir });
  }
  packages.sort((a, b) => a.name.localeCompare(b.name));
  return packages;
}
