import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  detectDefaultBase,
  isScopeMode,
  resolveScopePlan,
  ScopeError,
} from '../../src/scope/resolve.js';

describe('resolveScopePlan', () => {
  let dir: string;
  let savedBaseRef: string | undefined;
  const git = (...args: string[]): string =>
    execFileSync('git', args, { cwd: dir, encoding: 'utf-8' }).trim();

  beforeEach(() => {
    savedBaseRef = process.env.GITHUB_BASE_REF;
    delete process.env.GITHUB_BASE_REF;
    dir = mkdtempSync(join(tmpdir(), 'scope-resolve-'));
    git('init', '-q', '-b', 'main');
    git('config', 'user.email', 't@e.com');
    git('config', 'user.name', 'T');
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'src', 'a.ts'), 'export const a = 1;\n');
    git('add', '.');
    git('commit', '-qm', 'base');
    git('checkout', '-qb', 'feature');
    writeFileSync(join(dir, 'src', 'b.ts'), 'export const b = 1;\n');
    writeFileSync(join(dir, 'notes.md'), 'x\n');
    git('add', '.');
    git('commit', '-qm', 'feature');
  });

  afterEach(() => {
    if (savedBaseRef === undefined) delete process.env.GITHUB_BASE_REF;
    else process.env.GITHUB_BASE_REF = savedBaseRef;
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns null for full scope', async () => {
    expect(await resolveScopePlan(dir, { mode: 'full' })).toBeNull();
  });

  it('diffs against the merge-base with the detected default branch', async () => {
    writeFileSync(join(dir, 'src', 'a.ts'), 'export const a = 2;\n');
    const plan = await resolveScopePlan(dir, { mode: 'lines' });
    expect(plan!.mode).toBe('lines');
    expect(plan!.base).toBe('main');
    expect(plan!.diffBase).toBe(git('rev-parse', 'main'));
    expect(plan!.files).toEqual([
      resolve(dir, 'src/a.ts'),
      resolve(dir, 'src/b.ts'),
    ]);
  });

  it('honors an explicit base and rejects unresolvable or option-shaped refs', async () => {
    const plan = await resolveScopePlan(dir, { mode: 'files', base: 'HEAD' });
    expect(plan!.files).toEqual([]);
    await expect(
      resolveScopePlan(dir, { mode: 'files', base: 'nope' }),
    ).rejects.toThrow('Cannot resolve git ref "nope" for --base');
    await expect(
      resolveScopePlan(dir, { mode: 'files', base: '--output=x' }),
    ).rejects.toBeInstanceOf(ScopeError);
    await expect(
      resolveScopePlan(dir, {
        mode: 'files',
        base: 'nope',
        legacy: 'changed-files-from',
      }),
    ).rejects.toThrow('for --changed-files-from');
  });

  it('keeps --changed-files-from as a direct diff (no merge-base)', async () => {
    const plan = await resolveScopePlan(dir, {
      mode: 'files',
      base: 'main',
      legacy: 'changed-files-from',
    });
    expect(plan!.diffBase).toBe('main');
    expect(plan!.files).toEqual([resolve(dir, 'src/b.ts')]);
  });

  it('errors when the base shares no history with HEAD', async () => {
    git('checkout', '-q', '--orphan', 'island');
    git('commit', '-qm', 'island');
    await expect(
      resolveScopePlan(dir, { mode: 'files', base: 'feature' }),
    ).rejects.toThrow('No merge-base between "feature" and HEAD');
  });

  it('uses the index for staged and folds untracked for --diff', async () => {
    writeFileSync(join(dir, 'src', 'c.ts'), 'export const c = 1;\n');
    writeFileSync(join(dir, 'src', 'u.ts'), 'export const u = 1;\n');
    git('add', 'src/c.ts');
    const staged = await resolveScopePlan(dir, { mode: 'files', staged: true });
    expect(staged!.base).toBeUndefined();
    expect(staged!.files).toEqual([resolve(dir, 'src/c.ts')]);

    const diff = await resolveScopePlan(dir, { mode: 'files', legacy: 'diff' });
    expect(diff!.base).toBe('HEAD');
    expect(diff!.files).toEqual([
      resolve(dir, 'src/c.ts'),
      resolve(dir, 'src/u.ts'),
    ]);
  });

  it('errors when no default branch can be detected', async () => {
    git('branch', '-q', '-m', 'main', 'trunk');
    await expect(resolveScopePlan(dir, { mode: 'changed' })).rejects.toThrow(
      'Cannot detect a default branch',
    );
  });

  describe('detectDefaultBase', () => {
    it('prefers the PR base from GITHUB_BASE_REF', async () => {
      process.env.GITHUB_BASE_REF = 'feature';
      expect(await detectDefaultBase(dir)).toBe('feature');
    });

    it('follows origin/HEAD when a remote is configured', async () => {
      const remote = mkdtempSync(join(tmpdir(), 'scope-remote-'));
      try {
        execFileSync('git', ['clone', '-q', dir, remote]);
        expect(await detectDefaultBase(remote)).toBe('origin/feature');
      } finally {
        rmSync(remote, { recursive: true, force: true });
      }
    });

    it('falls back to master and finally null', async () => {
      git('branch', '-q', '-m', 'main', 'master');
      expect(await detectDefaultBase(dir)).toBe('master');
      git('branch', '-q', '-m', 'master', 'trunk');
      expect(await detectDefaultBase(dir)).toBeNull();
    });
  });

  it('recognizes scope modes', () => {
    expect(isScopeMode('lines')).toBe(true);
    expect(isScopeMode('nope')).toBe(false);
  });
});
