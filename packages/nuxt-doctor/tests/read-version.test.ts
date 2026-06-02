import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const cleanDir = resolve(here, 'fixtures/clean');

describe('readVersion fallback', () => {
  let stdout: string[];
  let originalExitCode: typeof process.exitCode;

  beforeEach(() => {
    stdout = [];
    originalExitCode = process.exitCode;
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      stdout.push(String(chunk));
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('node:fs');
    vi.resetModules();
    process.exitCode = originalExitCode;
  });

  it('still audits when reading package.json throws (catch branch)', async () => {
    vi.resetModules();
    vi.doMock('node:fs', async (importOriginal) => {
      const actual = await importOriginal<typeof import('node:fs')>();
      return {
        ...actual,
        readFileSync: (
          path: Parameters<typeof actual.readFileSync>[0],
          ...rest: unknown[]
        ) => {
          if (typeof path === 'string' && path.endsWith('package.json')) {
            throw new Error('cannot read package.json');
          }
          return (
            actual.readFileSync as (
              ...a: [Parameters<typeof actual.readFileSync>[0], ...unknown[]]
            ) => ReturnType<typeof actual.readFileSync>
          )(path, ...rest);
        },
      };
    });

    const { run } = await import('../src/cli.js');

    const code = await run([
      'node',
      'nuxt-doctor',
      cleanDir,
      '--no-dead-code',
      '--format',
      'json',
    ]);

    expect(code).toBe(0);
    const report = JSON.parse(stdout.join(''));
    expect(report.score.value).toBe(100);
  });

  it('defaults version to 0.0.0 when package.json has no version field', async () => {
    vi.resetModules();
    vi.doMock('node:fs', async (importOriginal) => {
      const actual = await importOriginal<typeof import('node:fs')>();
      return {
        ...actual,
        readFileSync: (
          path: Parameters<typeof actual.readFileSync>[0],
          ...rest: unknown[]
        ) => {
          if (typeof path === 'string' && path.endsWith('package.json')) {
            return '{}';
          }
          return (
            actual.readFileSync as (
              ...a: [Parameters<typeof actual.readFileSync>[0], ...unknown[]]
            ) => ReturnType<typeof actual.readFileSync>
          )(path, ...rest);
        },
      };
    });

    const { run } = await import('../src/cli.js');

    const code = await run([
      'node',
      'nuxt-doctor',
      cleanDir,
      '--no-dead-code',
      '--format',
      'json',
    ]);

    expect(code).toBe(0);
    const report = JSON.parse(stdout.join(''));
    expect(report.score.value).toBe(100);
  });

  it('audits normally on the readVersion success path', async () => {
    vi.resetModules();
    const { run } = await import('../src/cli.js');

    const code = await run([
      'node',
      'nuxt-doctor',
      cleanDir,
      '--no-dead-code',
      '--format',
      'json',
    ]);

    expect(code).toBe(0);
    const report = JSON.parse(stdout.join(''));
    expect(report.score.value).toBe(100);
  });
});
