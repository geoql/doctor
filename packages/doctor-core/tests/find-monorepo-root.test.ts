import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findMonorepoRoot } from '../src/project-info/find-monorepo-root.js';

async function tmp(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'geoql-doctor-monorepo-'));
}

describe('findMonorepoRoot', () => {
  it('detects pnpm via pnpm-workspace.yaml walking up from a nested dir', async () => {
    const root = await tmp();
    await writeFile(
      join(root, 'pnpm-workspace.yaml'),
      'packages:\n  - apps/*\n',
    );
    const nested = join(root, 'apps', 'web');
    await mkdir(nested, { recursive: true });
    const result = await findMonorepoRoot(nested);
    expect(result).toEqual({ root, kind: 'pnpm' });
  });

  it('detects yarn via workspaces + yarn.lock', async () => {
    const root = await tmp();
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ workspaces: ['packages/*'] }),
    );
    await writeFile(join(root, 'yarn.lock'), '');
    const result = await findMonorepoRoot(root);
    expect(result).toEqual({ root, kind: 'yarn' });
  });

  it('detects npm via workspaces + package-lock.json', async () => {
    const root = await tmp();
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ workspaces: { packages: ['packages/*'] } }),
    );
    await writeFile(join(root, 'package-lock.json'), '{}');
    const result = await findMonorepoRoot(root);
    expect(result).toEqual({ root, kind: 'npm' });
  });

  it('detects turbo via turbo.json', async () => {
    const root = await tmp();
    await writeFile(join(root, 'turbo.json'), '{}');
    const result = await findMonorepoRoot(root);
    expect(result).toEqual({ root, kind: 'turbo' });
  });

  it('returns the original directory with null kind when nothing is found', async () => {
    const root = await tmp();
    const nested = join(root, 'a', 'b');
    await mkdir(nested, { recursive: true });
    const result = await findMonorepoRoot(nested);
    expect(result).toEqual({ root: nested, kind: null });
  });

  it('ignores workspaces lacking a matching lockfile', async () => {
    const root = await tmp();
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ workspaces: ['packages/*'] }),
    );
    const result = await findMonorepoRoot(root);
    expect(result).toEqual({ root, kind: null });
  });

  it('stops at the first match closest to the start directory', async () => {
    const outer = await tmp();
    await writeFile(join(outer, 'pnpm-workspace.yaml'), 'packages: []\n');
    const inner = join(outer, 'nested');
    await mkdir(inner, { recursive: true });
    await writeFile(join(inner, 'turbo.json'), '{}');
    const result = await findMonorepoRoot(inner);
    expect(result).toEqual({ root: inner, kind: 'turbo' });
  });
});
