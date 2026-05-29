import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  workspaces?: string[] | { packages?: string[] };
  engines?: Record<string, string>;
}

export async function readPackageJson(
  dir: string,
): Promise<PackageJson | null> {
  try {
    const source = await readFile(join(dir, 'package.json'), 'utf8');
    return JSON.parse(source) as PackageJson;
  } catch {
    return null;
  }
}
