import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { run } from '../src/cli.js';

const here = dirname(fileURLToPath(import.meta.url));
const cleanDir = resolve(here, 'fixtures/clean');
const violationDir = resolve(here, 'fixtures/violation');
const badConfig = resolve(here, 'fixtures/bad-config/doctor.config.ts');

const ANSI = new RegExp(`${String.fromCharCode(27)}\\[`);

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
    delete process.env.NO_COLOR;
  });

  it('audits a clean project as JSON envelope and exits 0', async () => {
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
    expect(report.schemaVersion).toBe('1');
    expect(report.score.value).toBe(100);
    expect(report.score.bySeverity.error).toBe(0);
    expect(report.diagnostics).toEqual([]);
    expect(stderr.join('')).toBe('');
  });

  it('reports template violations as JSON and exits 1', async () => {
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
    expect(report.score.bySeverity.error).toBe(1);
    const ruleIds = report.diagnostics.map((d: { ruleId: string }) => d.ruleId);
    expect(ruleIds).toContain('vue-doctor/template/v-for-has-key');
  });

  it('defaults to the agent reporter when no format flag is given', async () => {
    const code = await run(['node', 'vue-doctor', cleanDir]);

    expect(code).toBe(0);
    const text = stdout.join('');
    expect(text).toContain('@geoql/vue-doctor v');
    expect(text).toContain('SCORE: 100/100 (threshold: 0)');
    expect(text).toContain('FINDINGS: 0 (clean)');
    expect(text).not.toMatch(ANSI);
    expect(() => JSON.parse(text)).toThrow();
  });

  it('falls back to the agent reporter when --format is unknown', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      cleanDir,
      '--format',
      'bogus',
    ]);

    expect(code).toBe(0);
    const text = stdout.join('');
    expect(text).toContain('SCORE:');
    expect(() => JSON.parse(text)).toThrow();
  });

  it('falls back to the agent reporter when --format is empty (falsy)', async () => {
    const code = await run(['node', 'vue-doctor', cleanDir, '--format', '']);

    expect(code).toBe(0);
    const text = stdout.join('');
    expect(text).toContain('SCORE:');
    expect(() => JSON.parse(text)).toThrow();
  });

  it('honors --json as a shorthand for the json envelope', async () => {
    const code = await run(['node', 'vue-doctor', cleanDir, '--json']);

    expect(code).toBe(0);
    const report = JSON.parse(stdout.join(''));
    expect(report.schemaVersion).toBe('1');
  });

  it('honors --json-compact as a single line', async () => {
    const code = await run(['node', 'vue-doctor', cleanDir, '--json-compact']);

    expect(code).toBe(0);
    const out = stdout.join('');
    expect(out.endsWith('\n')).toBe(true);
    expect(out.trimEnd()).not.toContain('\n');
    expect(JSON.parse(out).schemaVersion).toBe('1');
  });

  it('renders colored output with --format pretty', async () => {
    delete process.env.NO_COLOR;
    const code = await run([
      'node',
      'vue-doctor',
      violationDir,
      '--format',
      'pretty',
    ]);

    expect(code).toBe(1);
    expect(stdout.join('')).toMatch(ANSI);
  });

  it('disables color with --no-color on the pretty reporter', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      cleanDir,
      '--format',
      'pretty',
      '--no-color',
    ]);

    expect(code).toBe(0);
    expect(stdout.join('')).not.toMatch(ANSI);
  });

  it('suppresses NEXT STEPS with --quiet', async () => {
    const code = await run(['node', 'vue-doctor', violationDir, '--quiet']);

    expect(code).toBe(1);
    expect(stdout.join('')).not.toContain('NEXT STEPS:');
  });

  it('accepts --fail-on warn and still exits 0 on a clean project', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      cleanDir,
      '--format',
      'json',
      '--fail-on',
      'warn',
    ]);

    expect(code).toBe(0);
    const report = JSON.parse(stdout.join(''));
    expect(report.score.passed).toBe(true);
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

    expect(code).toBe(1);
    const report = JSON.parse(stdout.join(''));
    expect(report.score.bySeverity.error).toBe(1);
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
    expect(report.score.bySeverity.error).toBe(1);
  });

  it('defaults the path to the current working directory when omitted', async () => {
    process.chdir(cleanDir);
    const code = await run(['node', 'vue-doctor', '--format', 'json']);

    expect(code).toBe(0);
    const report = JSON.parse(stdout.join(''));
    expect(report.projectInfo.rootDirectory).toBe(cleanDir);
    expect(report.timing.analyzedFileCount).toBe(1);
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
