import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { audit } from '../src/audit.js';
import * as runModule from '../src/oxlint/run.js';

async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-fix-wire-'));
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, name), content);
  }
  return dir;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('audit --fix wiring into runScriptPass', () => {
  it('forwards fix:true to runScriptPass on a full scan', async () => {
    const dir = await fixture({
      'clean.vue': '<template><div /></template>\n',
    });
    const spy = vi
      .spyOn(runModule, 'runScriptPass')
      .mockResolvedValue({ diagnostics: [], stderr: '', exitCode: 0 });
    await audit({ rootDir: dir, deadCode: false, fix: true });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]![0].fix).toBe(true);
  });

  it('does not forward fix when fix is unset', async () => {
    const dir = await fixture({
      'clean.vue': '<template><div /></template>\n',
    });
    const spy = vi
      .spyOn(runModule, 'runScriptPass')
      .mockResolvedValue({ diagnostics: [], stderr: '', exitCode: 0 });
    await audit({ rootDir: dir, deadCode: false });
    expect(spy.mock.calls[0]![0].fix).toBeFalsy();
  });

  it('SAFETY: suppresses fix when scopeFiles is set (diff/staged scan)', async () => {
    const dir = await fixture({
      'A.vue': '<template><div /></template>\n',
    });
    const spy = vi
      .spyOn(runModule, 'runScriptPass')
      .mockResolvedValue({ diagnostics: [], stderr: '', exitCode: 0 });
    await audit({
      rootDir: dir,
      deadCode: false,
      fix: true,
      scopeFiles: [resolve(dir, 'A.vue')],
    });
    expect(spy.mock.calls[0]![0].fix).toBeFalsy();
  });

  it('threads fixExcludes through to runScriptPass', async () => {
    const dir = await fixture({
      'clean.vue': '<template><div /></template>\n',
    });
    const spy = vi
      .spyOn(runModule, 'runScriptPass')
      .mockResolvedValue({ diagnostics: [], stderr: '', exitCode: 0 });
    await audit({
      rootDir: dir,
      deadCode: false,
      fix: true,
      fixExcludes: ['vue/no-import-compiler-macros'],
    });
    expect(spy.mock.calls[0]![0].fixExcludes).toEqual([
      'vue/no-import-compiler-macros',
    ]);
  });
});
