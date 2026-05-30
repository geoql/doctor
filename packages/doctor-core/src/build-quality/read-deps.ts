import { dirname } from 'node:path';
import { readPackageJson } from '../project-info/read-package-json.js';

export interface PackageDeps {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export async function readDeps(
  packageJsonPath: string,
): Promise<PackageDeps | null> {
  const pkg = await readPackageJson(dirname(packageJsonPath));
  if (pkg === null) return null;
  return {
    dependencies: pkg.dependencies ?? {},
    devDependencies: pkg.devDependencies ?? {},
  };
}
