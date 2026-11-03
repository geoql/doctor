import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { run } from '../src/cli.js';

const BIN = 'nuxt-doctor';
const VIOLATION = (name: string): string =>
  `<template><ul><li v-for="${name} in items">{{ ${name} }}</li></ul></template>\n`;

describe(`${BIN} --baseline`, () => {
  let stdout: string[];
  let stderr: string[];
  let dir: string;
  let savedCi: string | undefined;

  const sh = (...args: string[]): void => {
    execFileSync('git', args, { cwd: dir, stdio: 'ignore' });
  };
  const runJson = async (...extra: string[]) => {
    stdout = [];
    stderr = [];
    const code = await run([
      'node',
      BIN,
      dir,
      '--json',
      '--no-dead-code',
      ...extra,
    ]);
    return { code, report: stdout.length ? JSON.parse(stdout.join('')) : null };
  };

  beforeEach(() => {
    stdout = [];
    stderr = [];
    savedCi = process.env.GITHUB_ACTIONS;
    delete process.env.GITHUB_ACTIONS;
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      stdout.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
      stderr.push(String(chunk));
      return true;
    });
    dir = mkdtempSync(join(tmpdir(), `${BIN}-baseline-`));
    sh('init', '-q');
    sh('config', 'user.email', 't@e.com');
    sh('config', 'user.name', 'T');
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'package.json'), '{"name":"x"}\n');
    writeFileSync(join(dir, 'src', 'Old.vue'), VIOLATION('i'));
    sh('add', '.');
    sh('commit', '-qm', 'base');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
    if (savedCi !== undefined) process.env.GITHUB_ACTIONS = savedCi;
    rmSync(dir, { recursive: true, force: true });
  });

  it('records fingerprints, configHash, and sourceRevision in --json', async () => {
    const { report } = await runJson();
    expect(report.configHash).toMatch(/^[0-9a-f]{16}$/);
    expect(report.sourceRevision).toMatch(/^[0-9a-f]{40}$/);
    expect(report.diagnostics.length).toBeGreaterThan(0);
    for (const d of report.diagnostics) {
      expect(d.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('gates only new findings while the score still covers all of them', async () => {
    const baseFile = join(dir, 'doctor-baseline.json');
    const base = await runJson('--output', baseFile);
    expect(base.code).toBe(1);

    const unchanged = await runJson('--baseline', baseFile);
    expect(unchanged.code).toBe(0);
    expect(unchanged.report.diagnostics).toEqual([]);
    expect(unchanged.report.score.bySeverity.error).toBe(0);
    expect(unchanged.report.score.value).toBeLessThan(100);
    expect(unchanged.report.baseline).toMatchObject({
      newCount: 0,
      fixedCount: 0,
    });

    // A pure line shift + a new violating file.
    writeFileSync(join(dir, 'src', 'Old.vue'), `\n\n${VIOLATION('i')}`);
    writeFileSync(join(dir, 'src', 'New.vue'), VIOLATION('j'));
    const changed = await runJson('--baseline', baseFile);
    expect(changed.code).toBe(1);
    const files = changed.report.diagnostics.map(
      (d: { file: string }) => d.file,
    );
    expect(files.length).toBeGreaterThan(0);
    expect(files.every((f: string) => f.endsWith('New.vue'))).toBe(true);
    expect(changed.report.baseline.newCount).toBe(files.length);
    expect(changed.report.baseline.file).toBe(baseFile);

    stdout = [];
    await run(['node', BIN, dir, '--no-dead-code', '--baseline', baseFile]);
    expect(stdout.join('')).toContain('BASELINE: ');
  });

  it('exits 2 for an unusable or incompatible baseline', async () => {
    const bogus = join(dir, 'bogus.json');
    writeFileSync(bogus, '{"schemaVersion":"1","diagnostics":[]}');
    const bad = await runJson('--baseline', bogus);
    expect(bad.code).toBe(2);
    expect(stderr.join('')).toContain('predates diagnostic fingerprints');

    const baseFile = join(dir, 'b.json');
    await runJson('--output', baseFile);
    const mismatch = await runJson(
      '--baseline',
      baseFile,
      '--rule',
      'vue-doctor/template/v-for-has-key:off',
    );
    expect(mismatch.code).toBe(2);
    expect(stderr.join('')).toContain('different finding-affecting settings');
  });
});
