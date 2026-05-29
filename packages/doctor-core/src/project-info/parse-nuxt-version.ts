import type { PackageJson } from './read-package-json.js';
import { resolveDepVersion } from './resolve-dep-version.js';

export function parseNuxtVersion(
  rootDirectory: string,
  monorepoRoot: string,
  pkg: PackageJson | null,
): Promise<string | null> {
  return resolveDepVersion('nuxt', rootDirectory, monorepoRoot, pkg);
}
