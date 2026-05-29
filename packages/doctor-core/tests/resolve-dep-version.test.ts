import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { PackageJson } from '../src/project-info/read-package-json.js';
import { resolveDepVersion } from '../src/project-info/resolve-dep-version.js';
import { parseNuxtVersion } from '../src/project-info/parse-nuxt-version.js';
import { parseVueVersion } from '../src/project-info/parse-vue-version.js';

async function tmp(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'geoql-doctor-depver-'));
}

async function installDep(
  base: string,
  dep: string,
  pkg: Record<string, unknown>,
): Promise<void> {
  const dir = join(base, 'node_modules', dep);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'package.json'), JSON.stringify(pkg));
}

describe('resolveDepVersion', () => {
  it('prefers the installed node_modules version under rootDir', async () => {
    const root = await tmp();
    await installDep(root, 'vue', { version: '3.5.18' });
    const pkg: PackageJson = { dependencies: { vue: '^3.4.0' } };
    expect(await resolveDepVersion('vue', root, root, pkg)).toBe('3.5.18');
  });

  it('falls back to the installed version under the monorepo root', async () => {
    const root = await tmp();
    const repo = await tmp();
    await installDep(repo, 'vue', { version: '3.5.20' });
    const pkg: PackageJson = { dependencies: { vue: '^3.4.0' } };
    expect(await resolveDepVersion('vue', root, repo, pkg)).toBe('3.5.20');
  });

  it('coerces the declared dependencies range when nothing is installed', async () => {
    const root = await tmp();
    const pkg: PackageJson = { dependencies: { vue: '^3.5.0' } };
    expect(await resolveDepVersion('vue', root, root, pkg)).toBe('3.5.0');
  });

  it('coerces the declared devDependencies range', async () => {
    const root = await tmp();
    const pkg: PackageJson = { devDependencies: { typescript: '~6.0.3' } };
    expect(await resolveDepVersion('typescript', root, root, pkg)).toBe(
      '6.0.3',
    );
  });

  it('strips workspace and npm-alias prefixes via coerce', async () => {
    const root = await tmp();
    const pkg: PackageJson = {
      dependencies: { a: 'workspace:^1.2.3', b: 'npm:pkg@4.5.6' },
    };
    expect(await resolveDepVersion('a', root, root, pkg)).toBe('1.2.3');
    expect(await resolveDepVersion('b', root, root, pkg)).toBe('4.5.6');
  });

  it('returns null for an uncoercible range such as workspace:*', async () => {
    const root = await tmp();
    const pkg: PackageJson = { dependencies: { a: 'workspace:*' } };
    expect(await resolveDepVersion('a', root, root, pkg)).toBeNull();
  });

  it('returns null when the dep is declared nowhere', async () => {
    const root = await tmp();
    expect(await resolveDepVersion('vue', root, root, null)).toBeNull();
  });

  it('ignores an installed package.json that lacks a version field', async () => {
    const root = await tmp();
    await installDep(root, 'vue', { name: 'vue' });
    const pkg: PackageJson = { dependencies: { vue: '^3.5.0' } };
    expect(await resolveDepVersion('vue', root, root, pkg)).toBe('3.5.0');
  });
});

describe('parseVueVersion / parseNuxtVersion wrappers', () => {
  it('parseVueVersion resolves the vue dependency', async () => {
    const root = await tmp();
    const pkg: PackageJson = { dependencies: { vue: '^3.5.0' } };
    expect(await parseVueVersion(root, root, pkg)).toBe('3.5.0');
  });

  it('parseNuxtVersion resolves the nuxt dependency', async () => {
    const root = await tmp();
    const pkg: PackageJson = { devDependencies: { nuxt: '^4.0.0' } };
    expect(await parseNuxtVersion(root, root, pkg)).toBe('4.0.0');
  });
});
