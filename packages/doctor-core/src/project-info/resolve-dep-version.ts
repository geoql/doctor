import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { coerce } from 'semver';
import type { PackageJson } from './read-package-json.js';

async function readInstalledVersion(
  base: string,
  dep: string,
): Promise<string | null> {
  try {
    const source = await readFile(
      join(base, 'node_modules', dep, 'package.json'),
      'utf8',
    );
    const parsed = JSON.parse(source) as { version?: string };
    return parsed.version ?? null;
  } catch {
    return null;
  }
}

function declaredRange(dep: string, pkg: PackageJson | null): string | null {
  return pkg?.dependencies?.[dep] ?? pkg?.devDependencies?.[dep] ?? null;
}

export async function resolveDepVersion(
  dep: string,
  rootDirectory: string,
  monorepoRoot: string,
  pkg: PackageJson | null,
): Promise<string | null> {
  const installed =
    (await readInstalledVersion(rootDirectory, dep)) ??
    (await readInstalledVersion(monorepoRoot, dep));
  if (installed) return installed;

  const range = declaredRange(dep, pkg);
  if (!range) return null;
  return coerce(range)?.version ?? null;
}
