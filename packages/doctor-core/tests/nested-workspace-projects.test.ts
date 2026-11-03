import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { findNestedWorkspaceExclusion } from '../src/project-info/nested-workspace-projects.js';

function pkg(dir: string, name: string): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name }));
}

describe('findNestedWorkspaceExclusion', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'doctor-nested-'));
    writeFileSync(
      join(root, 'pnpm-workspace.yaml'),
      "packages:\n  - 'apps/*'\n  - 'apps/*/nested'\n",
    );
    pkg(root, 'root');
    pkg(join(root, 'apps', 'web'), 'web');
    pkg(join(root, 'apps', 'admin'), 'admin');
    pkg(join(root, 'apps', 'web', 'nested'), 'web-nested');
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('excludes every workspace package below the scanned root', async () => {
    const result = await findNestedWorkspaceExclusion(root);
    expect(result.excluded.map((p) => p.name)).toEqual([
      'admin',
      'web',
      'web-nested',
    ]);
    expect(result.globs).toEqual([
      'apps/admin/**',
      'apps/web/**',
      'apps/web/nested/**',
    ]);
  });

  it('only excludes packages strictly below a package scan', async () => {
    const result = await findNestedWorkspaceExclusion(
      join(root, 'apps', 'web'),
    );
    expect(result.excluded.map((p) => p.name)).toEqual(['web-nested']);
    expect(result.globs).toEqual(['nested/**']);
  });

  it('keeps packages that contain an explicitly selected file', async () => {
    const result = await findNestedWorkspaceExclusion(root, [
      join(root, 'apps', 'admin', 'App.vue'),
    ]);
    expect(result.excluded.map((p) => p.name)).toEqual(['web', 'web-nested']);
  });

  it('is empty outside a pnpm workspace', async () => {
    const lone = mkdtempSync(join(tmpdir(), 'doctor-lone-'));
    try {
      const result = await findNestedWorkspaceExclusion(lone);
      expect(result).toEqual({ excluded: [], globs: [] });
    } finally {
      rmSync(lone, { recursive: true, force: true });
    }
  });
});
