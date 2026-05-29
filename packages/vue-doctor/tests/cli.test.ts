import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { run } from '../src/cli.js';

const here = dirname(fileURLToPath(import.meta.url));
const cleanDir = resolve(here, 'fixtures/clean');
const violationDir = resolve(here, 'fixtures/violation');
const badConfig = resolve(here, 'fixtures/bad-config/doctor.config.ts');

describe('run', () => {
  let stdout: string[];
  let stderr: string[];
  let originalExitCode: typeof process.exitCode;
  let originalCwd: string;

  beforeEach(() => {
    stdout = [];
    stderr = [];
    originalExitCode = process.exitCode;
    originalCwd = process.cwd();
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      stdout.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
      stderr.push(String(chunk));
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = originalExitCode;
    process.chdir(originalCwd);
  });

  it('audits a clean project as JSON and exits 0', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      cleanDir,
      '--format',
      'json',
    ]);

    expect(code).toBe(0);
    expect(process.exitCode).toBe(0);
    const report = JSON.parse(stdout.join(''));
    expect(report.score).toBe(100);
    expect(report.errorCount).toBe(0);
    expect(report.diagnostics).toEqual([]);
    expect(report.exitCode).toBe(0);
    expect(stderr.join('')).toBe('');
  });

  it('reports template violations and exits 1', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      violationDir,
      '--format',
      'json',
    ]);

    expect(code).toBe(1);
    expect(process.exitCode).toBe(1);
    const report = JSON.parse(stdout.join(''));
    expect(report.errorCount).toBe(1);
    expect(report.exitCode).toBe(1);
    const ruleIds = report.diagnostics.map((d: { ruleId: string }) => d.ruleId);
    expect(ruleIds).toContain('vue-doctor/template/v-for-has-key');
  });

  it('defaults to text output when no format flag is given', async () => {
    const code = await run(['node', 'vue-doctor', cleanDir]);

    expect(code).toBe(0);
    const text = stdout.join('');
    expect(text).toContain('Score:');
    expect(text).toContain('0 errors, 0 warnings in 1 file');
    // Plain text output is not valid JSON.
    expect(() => JSON.parse(text)).toThrow();
  });

  it('falls back to text when --format is an unknown value', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      cleanDir,
      '--format',
      'bogus',
    ]);

    expect(code).toBe(0);
    const text = stdout.join('');
    expect(text).toContain('Score:');
    expect(() => JSON.parse(text)).toThrow();
  });

  it('falls back to text when --format is empty (falsy)', async () => {
    const code = await run(['node', 'vue-doctor', cleanDir, '--format', '']);

    expect(code).toBe(0);
    const text = stdout.join('');
    expect(text).toContain('Score:');
    expect(() => JSON.parse(text)).toThrow();
  });

  it('accepts --fail-on warning and still exits 0 on a clean project', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      cleanDir,
      '--format',
      'json',
      '--fail-on',
      'warning',
    ]);

    expect(code).toBe(0);
    const report = JSON.parse(stdout.join(''));
    expect(report.exitCode).toBe(0);
  });

  it('falls back to error severity when --fail-on is an unknown value', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      violationDir,
      '--format',
      'json',
      '--fail-on',
      'bogus',
    ]);

    // An error-severity diagnostic still trips the default error threshold.
    expect(code).toBe(1);
    const report = JSON.parse(stdout.join(''));
    expect(report.errorCount).toBe(1);
  });

  it('falls back to error severity when --fail-on is empty (falsy)', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      violationDir,
      '--format',
      'json',
      '--fail-on',
      '',
    ]);

    expect(code).toBe(1);
    const report = JSON.parse(stdout.join(''));
    expect(report.errorCount).toBe(1);
  });

  it('defaults the path to the current working directory when omitted', async () => {
    process.chdir(cleanDir);
    const code = await run(['node', 'vue-doctor', '--format', 'json']);

    expect(code).toBe(0);
    const report = JSON.parse(stdout.join(''));
    expect(report.rootDir).toBe(cleanDir);
    expect(report.filesScanned).toBe(1);
  });

  it('writes to stderr and exits 2 when config loading throws', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      cleanDir,
      '--config',
      badConfig,
    ]);

    expect(code).toBe(2);
    expect(process.exitCode).toBe(2);
    expect(stdout.join('')).toBe('');
    expect(stderr.join('')).toContain('vue-doctor:');
    expect(stderr.join('')).toContain('boom from config');
  });

  it('returns 0 when no audit runs and exitCode is unset (--help)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    process.exitCode = undefined;

    const code = await run(['node', 'vue-doctor', '--help']);

    expect(code).toBe(0);
    expect(process.exitCode).toBeUndefined();
  });

  it('stringifies non-Error throwables in the catch branch', async () => {
    vi.resetModules();
    vi.doMock('@geoql/doctor-core', async (importOriginal) => {
      const actual =
        await importOriginal<typeof import('@geoql/doctor-core')>();
      return {
        ...actual,
        loadAuditConfig: () => {
          // Throw a non-Error value to exercise the String(err) branch.

          throw 'plain string failure';
        },
      };
    });
    const { run: runMocked } = await import('../src/cli.js');

    const code = await runMocked(['node', 'vue-doctor', cleanDir]);

    expect(code).toBe(2);
    expect(stderr.join('')).toContain('vue-doctor: plain string failure');

    vi.doUnmock('@geoql/doctor-core');
    vi.resetModules();
  });
});
