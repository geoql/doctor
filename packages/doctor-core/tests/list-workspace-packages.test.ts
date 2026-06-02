import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { listWorkspacePackages } from '../src/project-info/list-workspace-packages.js';

async function tmp(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'geoql-doctor-workspace-'));
}

async function writePackage(
  root: string,
  dir: string,
  pkg: Record<string, unknown> | string,
): Promise<string> {
  const target = join(root, dir);
  await mkdir(target, { recursive: true });
  await writeFile(
    join(target, 'package.json'),
    typeof pkg === 'string' ? pkg : JSON.stringify(pkg),
  );
  return target;
}

describe('listWorkspacePackages', () => {
  it('returns workspace packages sorted by name', async () => {
    const root = await tmp();
    await writeFile(
      join(root, 'pnpm-workspace.yaml'),
      "# workspace\npackages:\n  - 'packages/*'\n\nallowBuilds:\n  esbuild: true\n",
    );
    const dirC = await writePackage(root, 'packages/c', { name: 'pkg-c' });
    const dirA = await writePackage(root, 'packages/a', { name: 'pkg-a' });
    const dirB = await writePackage(root, 'packages/b', { name: 'pkg-b' });

    const result = await listWorkspacePackages(root);

    expect(result).toEqual([
      { name: 'pkg-a', dir: dirA },
      { name: 'pkg-b', dir: dirB },
      { name: 'pkg-c', dir: dirC },
    ]);
  });

  it('returns [] for a non-pnpm-workspace directory', async () => {
    const root = await tmp();
    await mkdir(join(root, 'src'), { recursive: true });
    expect(await listWorkspacePackages(root)).toEqual([]);
  });

  it('returns [] when pnpm-workspace.yaml declares no package globs', async () => {
    const root = await tmp();
    await writeFile(join(root, 'pnpm-workspace.yaml'), 'packages: []\n');
    expect(await listWorkspacePackages(root)).toEqual([]);
  });

  it('returns [] when the package globs match no directories', async () => {
    const root = await tmp();
    await writeFile(
      join(root, 'pnpm-workspace.yaml'),
      "packages:\n  - 'packages/*'\n",
    );
    expect(await listWorkspacePackages(root)).toEqual([]);
  });

  it('skips a matched directory whose package.json has no name', async () => {
    const root = await tmp();
    await writeFile(
      join(root, 'pnpm-workspace.yaml'),
      "packages:\n  - 'packages/*'\n",
    );
    const named = await writePackage(root, 'packages/named', {
      name: 'pkg-named',
    });
    await writePackage(root, 'packages/anon', { private: true });

    const result = await listWorkspacePackages(root);

    expect(result).toEqual([{ name: 'pkg-named', dir: named }]);
  });

  it('skips a matched directory whose package.json is malformed', async () => {
    const root = await tmp();
    await writeFile(
      join(root, 'pnpm-workspace.yaml'),
      "packages:\n  - 'packages/*'\n",
    );
    const ok = await writePackage(root, 'packages/ok', { name: 'pkg-ok' });
    await writePackage(root, 'packages/broken', '{ not valid json');

    const result = await listWorkspacePackages(root);

    expect(result).toEqual([{ name: 'pkg-ok', dir: ok }]);
  });
});
