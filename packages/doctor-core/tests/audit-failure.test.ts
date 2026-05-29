import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/oxlint/run.js', () => ({
  runScriptPass: vi.fn(async () => {
    throw new Error('Failed to resolve @geoql/oxlint-plugin-vue-doctor');
  }),
}));

const { audit } = await import('../src/audit.js');

async function cleanDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-audit-fail-'));
  await writeFile(join(dir, 'clean.vue'), '<template><div /></template>\n');
  return dir;
}

afterEach(() => {
  delete process.env.DOCTOR_DEBUG;
});

describe('audit script-pass failure', () => {
  it('sets exitCode 2 when the script pass fails with no diagnostics', async () => {
    const dir = await cleanDir();
    const report = await audit({ rootDir: dir });
    expect(report.exitCode).toBe(2);
    expect(report.errorCount).toBe(0);
  });

  it('writes a debug line when DOCTOR_DEBUG is set', async () => {
    process.env.DOCTOR_DEBUG = '1';
    const writes: string[] = [];
    const spy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation((chunk: string | Uint8Array): boolean => {
        writes.push(String(chunk));
        return true;
      });
    const dir = await cleanDir();
    const report = await audit({ rootDir: dir });
    spy.mockRestore();
    expect(report.exitCode).toBe(2);
    expect(writes.join('')).toContain('script pass failed');
  });

  it('coerces a non-Error rejection to a string', async () => {
    const runModule = await import('../src/oxlint/run.js');
    vi.mocked(runModule.runScriptPass).mockRejectedValueOnce('plain failure');
    const dir = await cleanDir();
    const report = await audit({ rootDir: dir });
    expect(report.exitCode).toBe(0);
  });
});
