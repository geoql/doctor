import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';

function readPkgMain(pkgJsonPath: string): string | undefined {
  try {
    const raw = readFileSync(pkgJsonPath, 'utf8');
    const pkg = JSON.parse(raw) as {
      exports?: {
        '.'?: { import?: string; default?: string };
        default?: string;
      };
      module?: string;
      main?: string;
    };
    const exp = pkg.exports?.['.'];
    if (exp?.import) return exp.import;
    if (exp?.default) return exp.default;
    if (pkg.module) return pkg.module;
    if (pkg.main) return pkg.main;
    return undefined;
  } catch {
    return undefined;
  }
}

function lookUpwards(fromDir: string, relPath: string): string | undefined {
  let current = resolvePath(fromDir);
  // Bounded ascent: stop when dirname() returns the same value (filesystem root).
  while (true) {
    const candidate = resolvePath(current, relPath);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

function resolveFromSelf(specifier: string): string | undefined {
  try {
    return fileURLToPath(import.meta.resolve(specifier));
  } catch {
    return undefined;
  }
}

export function resolveVueDoctorPluginPath(fromDir: string): string {
  const pkgJson = lookUpwards(
    fromDir,
    'node_modules/@geoql/oxlint-plugin-vue-doctor/package.json',
  );
  if (pkgJson) {
    const main = readPkgMain(pkgJson) ?? './dist/index.js';
    return resolvePath(dirname(pkgJson), main);
  }
  const selfMain = resolveFromSelf('@geoql/oxlint-plugin-vue-doctor');
  if (selfMain) return selfMain;
  return throwResolveError(fromDir);
}

function throwResolveError(fromDir: string): never {
  throw new Error(
    `Failed to resolve @geoql/oxlint-plugin-vue-doctor from ${fromDir}. Install it as a dependency of your project or use the bundled @geoql/vue-doctor CLI.`,
  );
}

export function resolveOxlintBin(fromDir: string): string {
  const pkgJson = lookUpwards(fromDir, 'node_modules/oxlint/package.json');
  if (pkgJson) {
    return resolvePath(dirname(pkgJson), 'bin/oxlint');
  }
  const selfPkgJson = resolveFromSelf('oxlint/package.json');
  if (selfPkgJson) {
    return resolvePath(dirname(selfPkgJson), 'bin/oxlint');
  }
  throw new Error(
    `Failed to resolve oxlint from ${fromDir}. Install oxlint as a dependency of your project.`,
  );
}
