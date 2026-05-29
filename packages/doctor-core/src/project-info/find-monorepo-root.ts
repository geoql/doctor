import { dirname, join } from 'node:path';
import type { MonorepoKind } from '../types/project-info.js';
import { pathExists } from './path-exists.js';
import { readPackageJson } from './read-package-json.js';

export interface MonorepoResult {
  root: string;
  kind: MonorepoKind;
}

async function detectKind(dir: string): Promise<MonorepoKind> {
  if (await pathExists(join(dir, 'pnpm-workspace.yaml'))) return 'pnpm';
  const pkg = await readPackageJson(dir);
  if (pkg?.workspaces) {
    if (await pathExists(join(dir, 'yarn.lock'))) return 'yarn';
    if (await pathExists(join(dir, 'package-lock.json'))) return 'npm';
  }
  if (await pathExists(join(dir, 'turbo.json'))) return 'turbo';
  return null;
}

export async function findMonorepoRoot(
  rootDirectory: string,
): Promise<MonorepoResult> {
  let current = rootDirectory;
  for (;;) {
    const kind = await detectKind(current);
    if (kind) return { root: current, kind };
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return { root: rootDirectory, kind: null };
}
