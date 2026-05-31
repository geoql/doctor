import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { run } from '../src/cli.js';

const here = dirname(fileURLToPath(import.meta.url));
const cleanDir = resolve(here, 'fixtures/clean');
const violationDir = resolve(here, 'fixtures/violation');
const disabledDir = resolve(here, 'fixtures/disabled');
const vMemoLargeListDir = resolve(here, 'fixtures/v-memo-large-list');
const noInlineObjectInListDir = resolve(
  here,
  'fixtures/no-inline-object-in-list',
);
const noComputedGetterInLoopDir = resolve(
  here,
  'fixtures/no-computed-getter-in-loop',
);
const deepVBindSpreadInListDir = resolve(
  here,
  'fixtures/deep-v-bind-spread-in-list',
);
const buildQualityDir = resolve(here, 'fixtures/build-quality');
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

  it('surfaces v-memo-on-large-list through the CLI on a real fixture', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      vMemoLargeListDir,
      '--format',
      'json',
    ]);

    expect(code).toBe(1);
    expect(process.exitCode).toBe(1);
    const report = JSON.parse(stdout.join(''));
    const ruleIds = report.diagnostics.map((d: { ruleId: string }) => d.ruleId);
    expect(ruleIds).toContain('vue-doctor/template/v-memo-on-large-list');
  });

  it('surfaces no-inline-object-prop-in-list through the CLI on a real fixture', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      noInlineObjectInListDir,
      '--format',
      'json',
    ]);

    expect(code).toBe(0);
    const report = JSON.parse(stdout.join(''));
    const ruleIds = report.diagnostics.map((d: { ruleId: string }) => d.ruleId);
    expect(ruleIds).toContain(
      'vue-doctor/template/no-inline-object-prop-in-list',
    );
    expect(report.score.bySeverity.warn).toBeGreaterThan(0);
  });

  it('surfaces no-computed-getter-in-template-loop through the CLI on a real fixture', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      noComputedGetterInLoopDir,
      '--format',
      'json',
    ]);

    expect(code).toBe(0);
    const report = JSON.parse(stdout.join(''));
    const ruleIds = report.diagnostics.map((d: { ruleId: string }) => d.ruleId);
    expect(ruleIds).toContain(
      'vue-doctor/template/no-computed-getter-in-template-loop',
    );
    expect(report.score.bySeverity.warn).toBeGreaterThan(0);
  });

  it('surfaces avoid-deep-v-bind-spread-in-list through the CLI on a real fixture', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      deepVBindSpreadInListDir,
      '--preset',
      'strict',
      '--format',
      'json',
    ]);

    expect(code).toBe(0);
    const report = JSON.parse(stdout.join(''));
    const ruleIds = report.diagnostics.map((d: { ruleId: string }) => d.ruleId);
    expect(ruleIds).toContain(
      'vue-doctor/template/avoid-deep-v-bind-spread-in-list',
    );
    expect(report.score.bySeverity.info).toBeGreaterThan(0);
  });

  it('surfaces multiple build-quality project checks through the CLI on a real fixture', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      buildQualityDir,
      '--preset',
      'strict',
      '--no-dead-code',
      '--format',
      'json',
    ]);

    expect(code).toBe(0);
    const report = JSON.parse(stdout.join(''));
    const projectDiags = report.diagnostics.filter(
      (d: { source: string }) => d.source === 'project',
    );
    const ruleIds = projectDiags.map((d: { ruleId: string }) => d.ruleId);
    expect(ruleIds).toContain(
      'vue-doctor/build-quality/tsconfig-strict-required',
    );
    expect(ruleIds).toContain('vue-doctor/build-quality/vue-tsc-in-devDeps');
    expect(ruleIds).toContain(
      'vue-doctor/build-quality/eslint-plugin-vue-installed',
    );
    expect(projectDiags.length).toBeGreaterThanOrEqual(3);
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

  it('emits SARIF v2.1.0 with --format sarif', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      '--no-dead-code',
      '--format',
      'sarif',
      violationDir,
    ]);
    expect(code).toBe(1);
    const parsed = JSON.parse(stdout.join('')) as {
      $schema: string;
      version: string;
      runs: {
        tool: { driver: { name: string } };
        results: { ruleId: string }[];
      }[];
    };
    expect(parsed.$schema).toContain('sarif-schema-2.1.0.json');
    expect(parsed.version).toBe('2.1.0');
    expect(parsed.runs[0]!.tool.driver.name).toBe('@geoql/vue-doctor');
    expect(parsed.runs[0]!.results.length).toBeGreaterThan(0);
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
        loadDoctorConfig: () => {
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

  it('applies --rule override and --no-dead-code on a clean project', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      '--rule',
      'vue-doctor/reactivity/watch-without-cleanup:off',
      '--no-dead-code',
      cleanDir,
    ]);

    expect(code).toBe(0);
    expect(stdout.join('')).toContain('SCORE:');
  });

  it('honors --include, --exclude, and --threshold', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      '--include',
      '**/*.vue',
      '--exclude',
      '**/node_modules/**',
      '--threshold',
      '50',
      cleanDir,
    ]);

    expect(code).toBe(0);
    expect(stdout.join('')).toContain('threshold: 50');
  });

  it('writes the report to --output instead of stdout', async () => {
    const outFile = resolve(here, '.cli-output.txt');
    const code = await run([
      'node',
      'vue-doctor',
      '--output',
      outFile,
      cleanDir,
    ]);

    expect(code).toBe(0);
    expect(stdout.join('')).toBe('');
    expect(readFileSync(outFile, 'utf-8')).toContain('SCORE:');
    rmSync(outFile, { force: true });
  });

  it('exits 2 on a --rule with no colon separator', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      '--rule',
      'badformat',
      cleanDir,
    ]);

    expect(code).toBe(2);
    expect(stderr.join('')).toContain('Invalid --rule');
  });

  it('exits 2 on a --rule with an invalid severity', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      '--rule',
      'a/b:loud',
      cleanDir,
    ]);

    expect(code).toBe(2);
    expect(stderr.join('')).toContain('Invalid severity');
  });

  it('exits 2 on a --rule with an empty rule id', async () => {
    const code = await run(['node', 'vue-doctor', '--rule', ':off', cleanDir]);

    expect(code).toBe(2);
    expect(stderr.join('')).toContain('Rule id must not be empty');
  });

  it('exits 2 on a non-numeric --threshold', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      '--threshold',
      'abc',
      cleanDir,
    ]);

    expect(code).toBe(2);
    expect(stderr.join('')).toContain('--threshold must be an integer');
  });

  it('exits 2 on an out-of-range --threshold', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      '--threshold',
      '150',
      cleanDir,
    ]);
    expect(code).toBe(2);
    expect(stderr.join('')).toContain('0-100');
  });

  it('emits GitHub Actions annotations with --annotations on findings', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      '--annotations',
      violationDir,
    ]);
    expect(code).toBe(1);
    expect(stdout.join('')).toMatch(/::error file=/);
  });

  it('does not emit annotations on a clean project', async () => {
    const code = await run(['node', 'vue-doctor', '--annotations', cleanDir]);
    expect(code).toBe(0);
    expect(stdout.join('')).not.toContain('::error');
  });

  it('suppresses annotations under --json to keep output parseable', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      '--annotations',
      '--json',
      violationDir,
    ]);
    expect(code).toBe(1);
    expect(() => JSON.parse(stdout.join(''))).not.toThrow();
  });

  it('outputs only the integer score with --score', async () => {
    const code = await run(['node', 'vue-doctor', '--score', cleanDir]);

    expect(code).toBe(0);
    expect(stdout.join('')).toBe('100\n');
  });

  it('exits 2 when --score is combined with --json', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      '--score',
      '--json',
      cleanDir,
    ]);

    expect(code).toBe(2);
    expect(stderr.join('')).toContain('mutually exclusive');
  });

  it('accepts a repeatable flag passed multiple times (array form)', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      '--rule',
      'vue-doctor/reactivity/watch-without-cleanup:off',
      '--rule',
      'vue-doctor/template/v-for-has-key:off',
      cleanDir,
    ]);

    expect(code).toBe(0);
    expect(stdout.join('')).toContain('SCORE:');
  });

  it('honors an inline doctor-disable directive by default and scores 100', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      '--no-dead-code',
      '--json',
      disabledDir,
    ]);

    expect(code).toBe(0);
    const report = JSON.parse(stdout.join(''));
    expect(report.diagnostics).toEqual([]);
    expect(report.score.value).toBe(100);
  });

  it('surfaces directive-suppressed findings with --no-respect-inline-disables', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      '--no-respect-inline-disables',
      '--no-dead-code',
      '--json',
      disabledDir,
    ]);

    expect(code).toBe(1);
    const report = JSON.parse(stdout.join(''));
    const ruleIds = report.diagnostics.map((d: { ruleId: string }) => d.ruleId);
    expect(ruleIds).toContain('vue-doctor/template/v-for-has-key');
  });

  it('skips lint passes with --no-lint and reports clean', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      '--no-lint',
      '--no-dead-code',
      '--json',
      violationDir,
    ]);

    expect(code).toBe(0);
    const report = JSON.parse(stdout.join(''));
    expect(report.diagnostics).toEqual([]);
    expect(report.score.value).toBe(100);
  });

  it('exits 2 when --diff and --staged are combined', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      '--diff',
      '--staged',
      cleanDir,
    ]);

    expect(code).toBe(2);
    expect(stderr.join('')).toContain('mutually exclusive');
  });

  it('scopes findings to changed files with --diff in a git repo', async () => {
    const gitDir = mkdtempSync(join(tmpdir(), 'cli-diff-'));
    const sh = (...args: string[]) =>
      execFileSync('git', args, { cwd: gitDir, stdio: 'ignore' });
    try {
      sh('init');
      sh('config', 'user.email', 't@e.com');
      sh('config', 'user.name', 'T');
      mkdirSync(join(gitDir, 'src'), { recursive: true });
      writeFileSync(join(gitDir, 'package.json'), '{"name":"x"}\n');
      writeFileSync(
        join(gitDir, 'src', 'Committed.vue'),
        '<template><ul><li v-for="i in items">{{ i }}</li></ul></template>\n',
      );
      sh('add', '.');
      sh('commit', '-m', 'base');
      writeFileSync(
        join(gitDir, 'src', 'Changed.vue'),
        '<template><ul><li v-for="j in items">{{ j }}</li></ul></template>\n',
      );

      const code = await run([
        'node',
        'vue-doctor',
        '--diff',
        '--json',
        gitDir,
      ]);
      expect(code).toBe(1);
      const report = JSON.parse(stdout.join(''));
      const files = report.diagnostics.map((d: { file: string }) => d.file);
      expect(files.length).toBeGreaterThan(0);
      expect(files.every((f: string) => f.endsWith('Changed.vue'))).toBe(true);
    } finally {
      rmSync(gitDir, { recursive: true, force: true });
    }
  });

  it('--full forces a complete scan, overriding --diff', async () => {
    const gitDir = mkdtempSync(join(tmpdir(), 'cli-full-'));
    const sh = (...args: string[]) =>
      execFileSync('git', args, { cwd: gitDir, stdio: 'ignore' });
    try {
      sh('init');
      sh('config', 'user.email', 't@e.com');
      sh('config', 'user.name', 'T');
      mkdirSync(join(gitDir, 'src'), { recursive: true });
      writeFileSync(join(gitDir, 'package.json'), '{"name":"x"}\n');
      writeFileSync(
        join(gitDir, 'src', 'Committed.vue'),
        '<template><ul><li v-for="i in items">{{ i }}</li></ul></template>\n',
      );
      sh('add', '.');
      sh('commit', '-m', 'base');
      // No working-tree changes: --diff alone would find nothing.
      const diffCode = await run([
        'node',
        'vue-doctor',
        '--diff',
        '--no-dead-code',
        '--json',
        gitDir,
      ]);
      expect(diffCode).toBe(0);
      expect(JSON.parse(stdout.join('')).diagnostics).toEqual([]);
      stdout.length = 0;

      // --full ignores --diff and scans the committed (unchanged) file.
      const fullCode = await run([
        'node',
        'vue-doctor',
        '--diff',
        '--full',
        '--no-dead-code',
        '--json',
        gitDir,
      ]);
      expect(fullCode).toBe(1);
      const files = JSON.parse(stdout.join('')).diagnostics.map(
        (d: { file: string }) => d.file,
      );
      expect(files.some((f: string) => f.endsWith('Committed.vue'))).toBe(true);
    } finally {
      rmSync(gitDir, { recursive: true, force: true });
    }
  });

  it('scopes findings to staged files with --staged in a git repo', async () => {
    const gitDir = mkdtempSync(join(tmpdir(), 'cli-staged-'));
    const sh = (...args: string[]) =>
      execFileSync('git', args, { cwd: gitDir, stdio: 'ignore' });
    try {
      sh('init');
      sh('config', 'user.email', 't@e.com');
      sh('config', 'user.name', 'T');
      mkdirSync(join(gitDir, 'src'), { recursive: true });
      writeFileSync(join(gitDir, 'package.json'), '{"name":"x"}\n');
      writeFileSync(
        join(gitDir, 'src', 'Base.vue'),
        '<template><div /></template>\n',
      );
      sh('add', '.');
      sh('commit', '-m', 'base');
      writeFileSync(
        join(gitDir, 'src', 'Staged.vue'),
        '<template><ul><li v-for="i in items">{{ i }}</li></ul></template>\n',
      );
      writeFileSync(
        join(gitDir, 'src', 'Unstaged.vue'),
        '<template><ul><li v-for="j in items">{{ j }}</li></ul></template>\n',
      );
      sh('add', 'src/Staged.vue');

      const code = await run([
        'node',
        'vue-doctor',
        '--staged',
        '--json',
        gitDir,
      ]);
      expect(code).toBe(1);
      const report = JSON.parse(stdout.join(''));
      const files = report.diagnostics.map((d: { file: string }) => d.file);
      expect(files.length).toBeGreaterThan(0);
      expect(files.every((f: string) => f.endsWith('Staged.vue'))).toBe(true);
    } finally {
      rmSync(gitDir, { recursive: true, force: true });
    }
  });

  it('exits 2 when --verbose and --quiet are combined', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      '--verbose',
      '--quiet',
      cleanDir,
    ]);

    expect(code).toBe(2);
    expect(stderr.join('')).toContain('mutually exclusive');
  });

  it('writes verbose trace to stderr with --verbose', async () => {
    const code = await run(['node', 'vue-doctor', '--verbose', violationDir]);

    expect(code).toBe(1);
    expect(stderr.join('')).toContain('TIMINGS');
    expect(stderr.join('')).toContain('RULE COUNTS');
  });

  it('leaves stdout as clean report when --verbose is used', async () => {
    const code = await run(['node', 'vue-doctor', '--verbose', violationDir]);

    expect(code).toBe(1);
    expect(stdout.join('')).toContain('SCORE:');
    expect(stdout.join('')).toContain('FINDINGS:');
    expect(stdout.join('')).not.toContain('TIMINGS');
  });

  it('omits report body with --quiet but keeps score and findings', async () => {
    const code = await run(['node', 'vue-doctor', '--quiet', violationDir]);

    expect(code).toBe(1);
    const out = stdout.join('');
    expect(out).toContain('SCORE:');
    expect(out).not.toContain('FINDINGS:');
    expect(out).not.toContain('NEXT STEPS:');
    expect(out).not.toContain('v-for');
  });

  it('--quiet on clean project outputs only score line', async () => {
    const code = await run(['node', 'vue-doctor', '--quiet', cleanDir]);

    expect(code).toBe(0);
    const out = stdout.join('');
    expect(out).toContain('SCORE:');
    expect(out).not.toContain('FINDINGS:');
    expect(out).not.toContain('NEXT STEPS:');
  });

  it('--preset strict surfaces info-severity rules excluded from recommended', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      '--preset',
      'strict',
      '--no-dead-code',
      '--format',
      'json',
      buildQualityDir,
    ]);
    expect(code).toBe(0);
    const report = JSON.parse(stdout.join(''));
    const ruleIds = report.diagnostics.map((d: { ruleId: string }) => d.ruleId);
    expect(ruleIds).toContain(
      'vue-doctor/build-quality/eslint-plugin-vue-installed',
    );
  });

  it('--preset minimal filters out info-severity rules', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      '--preset',
      'minimal',
      '--no-dead-code',
      '--format',
      'json',
      buildQualityDir,
    ]);
    expect(code).toBe(0);
    const report = JSON.parse(stdout.join(''));
    const infoDiags = report.diagnostics.filter(
      (d: { severity: string }) => d.severity === 'info',
    );
    expect(infoDiags.length).toBe(0);
  });

  it('exits 2 on an unknown --preset', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      '--preset',
      'bogus',
      '--no-dead-code',
      cleanDir,
    ]);
    expect(code).toBe(2);
    expect(stderr.join('')).toContain('preset: must be one of');
  });

  describe('list-rules subcommand', () => {
    it('prints the rule table with all rules by default', async () => {
      const code = await run(['node', 'vue-doctor', 'list-rules']);
      expect(code).toBe(0);
      const out = stdout.join('');
      expect(out).toContain('@geoql/vue-doctor');
      expect(out).toContain('vue-doctor/no-em-dash-in-string');
      expect(out).toContain('[recommended]');
    });

    it('filters by --preset recommended', async () => {
      const code = await run([
        'node',
        'vue-doctor',
        'list-rules',
        '--preset',
        'recommended',
      ]);
      expect(code).toBe(0);
      expect(stdout.join('')).not.toContain(
        'vue-doctor/reactivity/prefer-shallowRef-for-large-data',
      );
      expect(stdout.join('')).toContain(
        'vue-doctor/reactivity/watch-without-cleanup',
      );
    });

    it('filters by --category', async () => {
      const code = await run([
        'node',
        'vue-doctor',
        'list-rules',
        '--category',
        'ai-slop',
      ]);
      expect(code).toBe(0);
      const out = stdout.join('');
      expect(out).toContain('vue-doctor/no-em-dash-in-string');
      expect(out).not.toContain('vue-doctor/template/v-for-has-key');
    });

    it('filters by --source', async () => {
      const code = await run([
        'node',
        'vue-doctor',
        'list-rules',
        '--source',
        'oxlint-builtin',
      ]);
      expect(code).toBe(0);
      const out = stdout.join('');
      expect(out).toContain('vue/no-export-in-script-setup');
      expect(out).not.toContain('vue-doctor/no-em-dash-in-string');
    });

    it('filters by --severity', async () => {
      const code = await run([
        'node',
        'vue-doctor',
        'list-rules',
        '--severity',
        'error',
      ]);
      expect(code).toBe(0);
      const out = stdout.join('');
      expect(out).toContain('vue-doctor/template/v-for-has-key');
      expect(out).not.toContain('vue-doctor/no-em-dash-in-string');
    });

    it('emits structured JSON with --json', async () => {
      const code = await run([
        'node',
        'vue-doctor',
        'list-rules',
        '--category',
        'composition',
        '--json',
      ]);
      expect(code).toBe(0);
      const parsed = JSON.parse(stdout.join('')) as {
        count: number;
        rules: { id: string }[];
      };
      expect(parsed.count).toBeGreaterThan(0);
      expect(parsed.rules.every((r) => r.id.includes('composition'))).toBe(
        true,
      );
    });

    it('emits single-line JSON with --json-compact', async () => {
      const code = await run([
        'node',
        'vue-doctor',
        'list-rules',
        '--json-compact',
      ]);
      expect(code).toBe(0);
      const out = stdout.join('');
      expect(out).not.toContain('\n');
      expect(JSON.parse(out)).toHaveProperty('count');
    });

    it('renders "No rules matched." when filters return empty', async () => {
      const code = await run([
        'node',
        'vue-doctor',
        'list-rules',
        '--category',
        'ai-slop',
        '--severity',
        'info',
      ]);
      expect(code).toBe(0);
      expect(stdout.join('')).toContain('No rules matched.');
    });

    it('renders singular "1 rule" when filters yield exactly one match', async () => {
      const code = await run([
        'node',
        'vue-doctor',
        'list-rules',
        '--category',
        'sfc',
      ]);
      expect(code).toBe(0);
      const out = stdout.join('');
      expect(out).toContain('1 rule');
      expect(out).not.toContain('1 rules');
    });

    it('exits 2 on unknown --preset', async () => {
      const code = await run([
        'node',
        'vue-doctor',
        'list-rules',
        '--preset',
        'wrong',
      ]);
      expect(code).toBe(2);
      expect(stderr.join('')).toContain('unknown --preset');
    });

    it('exits 2 on unknown --category', async () => {
      const code = await run([
        'node',
        'vue-doctor',
        'list-rules',
        '--category',
        'bogus',
      ]);
      expect(code).toBe(2);
      expect(stderr.join('')).toContain('unknown --category');
    });

    it('exits 2 on unknown --source', async () => {
      const code = await run([
        'node',
        'vue-doctor',
        'list-rules',
        '--source',
        'bogus',
      ]);
      expect(code).toBe(2);
      expect(stderr.join('')).toContain('unknown --source');
    });

    it('exits 2 on unknown --severity', async () => {
      const code = await run([
        'node',
        'vue-doctor',
        'list-rules',
        '--severity',
        'fatal',
      ]);
      expect(code).toBe(2);
      expect(stderr.join('')).toContain('unknown --severity');
    });
  });

  describe('explain subcommand', () => {
    it('prints the rule metadata for a known rule', async () => {
      const code = await run([
        'node',
        'vue-doctor',
        'explain',
        'vue-doctor/template/v-for-has-key',
      ]);
      expect(code).toBe(0);
      const out = stdout.join('');
      expect(out).toContain('Rule:');
      expect(out).toContain('vue-doctor/template/v-for-has-key');
      expect(out).toContain('Severity:');
      expect(out).toContain('error');
      expect(out).toContain('docs.doctor.geoql.in');
    });

    it('marks off-by-default rules with the opt-in note', async () => {
      const code = await run([
        'node',
        'vue-doctor',
        'explain',
        'vue-doctor/reactivity/prefer-shallowRef-for-large-data',
      ]);
      expect(code).toBe(0);
      expect(stdout.join('')).toContain('off in `recommended`');
    });

    it('emits structured JSON with --json', async () => {
      const code = await run([
        'node',
        'vue-doctor',
        'explain',
        'vue-doctor/no-em-dash-in-string',
        '--json',
      ]);
      expect(code).toBe(0);
      const parsed = JSON.parse(stdout.join('')) as {
        id: string;
        severity: string;
        helpUri: string;
      };
      expect(parsed.id).toBe('vue-doctor/no-em-dash-in-string');
      expect(parsed.severity).toBe('warn');
      expect(parsed.helpUri).toContain('docs.doctor.geoql.in');
    });

    it('exits 2 on an unknown rule', async () => {
      const code = await run([
        'node',
        'vue-doctor',
        'explain',
        'does/not/exist',
      ]);
      expect(code).toBe(2);
      expect(stderr.join('')).toContain("unknown rule 'does/not/exist'");
    });
  });
});
