import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Rule #11 invariant: deno's byonm resolver, when publishing a CLI to JSR,
// follows into @geoql/doctor-core's source and must find every npm dep that
// doctor-core imports inside the CLI's own node_modules. So each static
// (non-@geoql workspace) dependency of doctor-core MUST be declared by every
// CLI package in its dependencies or devDependencies. A missing one fails the
// JSR publish with "Could not find a matching package for npm:<dep>" — exactly
// how @geoql/zod and @geoql/oxc-parser slipped through before.
const packagesDir = join(import.meta.dirname, '..', '..');

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function readPkg(name: string): PackageJson {
  return JSON.parse(
    readFileSync(join(packagesDir, name, 'package.json'), 'utf8'),
  ) as PackageJson;
}

const CLI_PACKAGES = ['vue-doctor', 'nuxt-doctor'] as const;

describe('byonm dep mirror (Rule #11)', () => {
  const core = readPkg('doctor-core');
  const coreStaticDeps = Object.keys(core.dependencies ?? {}).filter(
    (dep) => !dep.startsWith('@geoql/'),
  );

  it('doctor-core has static npm dependencies to mirror', () => {
    expect(coreStaticDeps.length).toBeGreaterThan(0);
  });

  for (const cli of CLI_PACKAGES) {
    it(`${cli} declares every doctor-core static dep for byonm`, () => {
      const pkg = readPkg(cli);
      const declared = new Set([
        ...Object.keys(pkg.dependencies ?? {}),
        ...Object.keys(pkg.devDependencies ?? {}),
      ]);
      const missing = coreStaticDeps.filter((dep) => !declared.has(dep));
      expect(missing).toEqual([]);
    });
  }
});
