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
const LIST = (tag: string, v: string): string =>
  `  <${tag}><li v-for="${v} in items">{{ ${v} }}</li></${tag}>`;

interface JsonDiag {
  file: string;
  line: number;
}

describe(`${BIN} --scope`, () => {
  let stdout: string[];
  let stderr: string[];
  let dir: string;
  let savedBaseRef: string | undefined;

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
  const where = (report: { diagnostics: JsonDiag[] }): string[] =>
    report.diagnostics.map((d) => `${d.file}:${d.line}`);

  beforeEach(() => {
    stdout = [];
    stderr = [];
    savedBaseRef = process.env.GITHUB_BASE_REF;
    delete process.env.GITHUB_BASE_REF;
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      stdout.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
      stderr.push(String(chunk));
      return true;
    });
    dir = mkdtempSync(join(tmpdir(), `${BIN}-scope-`));
    sh('init', '-q', '-b', 'main');
    sh('config', 'user.email', 't@e.com');
    sh('config', 'user.name', 'T');
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'package.json'), '{"name":"x"}\n');
    writeFileSync(
      join(dir, 'src', 'List.vue'),
      ['<template>', LIST('ul', 'i'), '</template>', ''].join('\n'),
    );
    writeFileSync(
      join(dir, 'src', 'Untouched.vue'),
      ['<template>', LIST('ul', 'k'), '</template>', ''].join('\n'),
    );
    sh('add', '.');
    sh('commit', '-qm', 'base');
    sh('checkout', '-qb', 'feature');
    // The change: one new violation in List.vue; its old one stays.
    writeFileSync(
      join(dir, 'src', 'List.vue'),
      ['<template>', LIST('ul', 'i'), LIST('ol', 'j'), '</template>', ''].join(
        '\n',
      ),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
    if (savedBaseRef !== undefined) process.env.GITHUB_BASE_REF = savedBaseRef;
    rmSync(dir, { recursive: true, force: true });
  });

  it('files: every finding in changed files, vs the auto-detected base', async () => {
    const { code, report } = await runJson('--scope', 'files');
    expect(code).toBe(1);
    expect(report.scope).toEqual({ mode: 'files', base: 'main' });
    expect(where(report)).toEqual(['src/List.vue:2', 'src/List.vue:3']);
  });

  it('lines: only findings on changed lines; score covers the changed files', async () => {
    const { report } = await runJson('--scope', 'lines', '--base', 'main');
    expect(where(report)).toEqual(['src/List.vue:3']);
    expect(report.score.bySeverity.error).toBe(1);
    const files = await runJson('--scope', 'files', '--base', 'main');
    expect(report.score.value).toBe(files.report.score.value);
  });

  it('changed: only findings new vs the base revision', async () => {
    const { code, report } = await runJson('--scope', 'changed');
    expect(code).toBe(1);
    expect(where(report)).toEqual(['src/List.vue:3']);
    expect(report.baseline).toEqual({
      file: 'git:main',
      matchedCount: 1,
      newCount: 1,
      fixedCount: 0,
    });
    stdout = [];
    await run(['node', BIN, dir, '--no-dead-code', '--scope', 'changed']);
    expect(stdout.join('')).toContain('SCOPE: changed (vs main)');
  });

  it('changed with nothing new exits 0', async () => {
    writeFileSync(
      join(dir, 'src', 'List.vue'),
      ['<template>', '', LIST('ul', 'i'), '</template>', ''].join('\n'),
    );
    const { code, report } = await runJson('--scope', 'changed');
    expect(code).toBe(0);
    expect(report.diagnostics).toEqual([]);
    expect(report.baseline.matchedCount).toBe(1);
  });

  it('contextual: an edit inside an element surfaces its unchanged finding', async () => {
    const multi = (body: string): string =>
      [
        '<template>',
        '  <div',
        '    v-html="html"',
        '    class="x"',
        '  >',
        `    {{ ${body} }}`,
        '  </div>',
        '</template>',
        '',
      ].join('\n');
    writeFileSync(join(dir, 'src', 'Multi.vue'), multi('i'));
    sh('add', 'src/Multi.vue');
    sh('commit', '-qm', 'multi');
    writeFileSync(join(dir, 'src', 'Multi.vue'), multi('i + 1'));
    const inMulti = (report: { diagnostics: JsonDiag[] }): string[] =>
      where(report).filter((w) => w.startsWith('src/Multi.vue'));
    const lines = await runJson('--scope', 'lines', '--base', 'HEAD');
    expect(inMulti(lines.report)).toEqual([]);
    const contextual = await runJson('--scope', 'contextual', '--base', 'HEAD');
    expect(contextual.report.scope).toEqual({
      mode: 'contextual',
      base: 'HEAD',
    });
    expect(inMulti(contextual.report)).toEqual(['src/Multi.vue:3']);
    for (const d of contextual.report.diagnostics) {
      expect(d).not.toHaveProperty('contextRanges');
    }
  });

  it('reads scope and base defaults from config', async () => {
    writeFileSync(
      join(dir, 'doctor.config.json'),
      JSON.stringify({ scope: 'lines', base: 'main' }),
    );
    const { report } = await runJson();
    expect(report.scope).toEqual({ mode: 'lines', base: 'main' });
    expect(where(report)).toEqual(['src/List.vue:3']);
    const full = await runJson('--full');
    expect(full.report.scope).toBeUndefined();
    expect(where(full.report)).toContain('src/Untouched.vue:2');
  });

  it('combines a scope with --baseline (baseline replaces the git base)', async () => {
    const baseFile = join(dir, 'base.json');
    sh('stash', '-q');
    await runJson('--output', baseFile);
    sh('stash', 'pop', '-q');
    const lines = await runJson('--scope', 'lines', '--baseline', baseFile);
    expect(where(lines.report)).toEqual(['src/List.vue:3']);
    expect(lines.report.baseline).toMatchObject({ newCount: 1, fixedCount: 0 });
    const changed = await runJson('--scope', 'changed', '--baseline', baseFile);
    expect(where(changed.report)).toEqual(['src/List.vue:3']);
    expect(changed.report.baseline.file).toBe(baseFile);
  });

  it.each([
    [['--scope', 'everything'], '--scope must be one of'],
    [['--scope', 'lines', '--diff'], 'cannot be combined'],
    [['--scope', 'files', '--base', 'nope'], 'Cannot resolve git ref "nope"'],
  ])('exits 2 for %j', async (args, message) => {
    const { code } = await runJson(...args);
    expect(code).toBe(2);
    expect(stderr.join('')).toContain(message);
  });
});
