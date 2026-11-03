import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  applyBaseline,
  BaselineError,
  readBaselineReport,
} from '../../src/baseline/apply.js';
import {
  combineConfigHashes,
  computeConfigHash,
} from '../../src/baseline/config-hash.js';
import { narrowReport } from '../../src/narrow-report.js';
import { scoreDiagnostics } from '../../src/score.js';
import type { AuditReport, Diagnostic } from '../../src/types.js';

function diag(overrides: Partial<Diagnostic> = {}): Diagnostic {
  return {
    file: '/r/a.ts',
    line: 1,
    column: 1,
    ruleId: 'vue-doctor/x',
    severity: 'error',
    message: 'm',
    source: 'oxlint',
    fingerprint: 'fp',
    ...overrides,
  };
}

function reportOf(
  diagnostics: Diagnostic[],
  overrides: Partial<AuditReport> = {},
): AuditReport {
  const scoreResult = scoreDiagnostics(diagnostics, { threshold: 0 });
  return {
    rootDir: '/r',
    filesScanned: 1,
    diagnostics,
    score: scoreResult.score,
    errorCount: scoreResult.errorCount,
    warnCount: scoreResult.warnCount,
    infoCount: scoreResult.infoCount,
    exitCode: scoreResult.errorCount > 0 ? 1 : 0,
    scoreResult,
    projectInfo: {
      framework: 'vue',
      frameworkDetected: true,
      vueVersion: null,
      nuxtVersion: null,
      capabilities: [],
      rootDirectory: '/r',
    },
    elapsedMs: 1,
    timings: { template: 0, sfc: 0, script: 0, deadCode: 0, total: 1 },
    ruleCounts: {},
    incomplete: false,
    configHash: 'hash',
    ...overrides,
  };
}

describe('narrowReport', () => {
  it('keeps the score but gates and counts only the kept subset', () => {
    const all = [
      diag(),
      diag({ severity: 'warn', ruleId: 'a/w' }),
      diag({ severity: 'info', ruleId: 'a/i' }),
      diag({ surface: 'test', ruleId: 'a/t' }),
    ];
    const report = reportOf(all);
    const warnOnly = narrowReport(report, [all[1]!, all[2]!, all[3]!], {
      failOn: 'error',
    });
    expect(warnOnly.score).toBe(report.score);
    expect(warnOnly.scoreResult.breakdown).toEqual(
      report.scoreResult.breakdown,
    );
    expect([
      warnOnly.errorCount,
      warnOnly.warnCount,
      warnOnly.infoCount,
    ]).toEqual([0, 1, 1]);
    expect(warnOnly.scoreResult.totalFindings).toBe(2);
    expect(warnOnly.ruleCounts).toEqual({ 'a/w': 1, 'a/i': 1, 'a/t': 1 });
    expect(warnOnly.exitCode).toBe(0);
    expect(narrowReport(report, [all[1]!], { failOn: 'warn' }).exitCode).toBe(
      1,
    );
    expect(narrowReport(report, [all[0]!], { failOn: 'none' }).exitCode).toBe(
      0,
    );
    expect(
      narrowReport(report, [all[3]!], {
        failOn: 'error',
        includeTestFiles: true,
      }).errorCount,
    ).toBe(1);
    expect(
      narrowReport({ ...report, exitCode: 2 }, [], { failOn: 'error' })
        .exitCode,
    ).toBe(2);
    expect(
      narrowReport(report, [all[1]!], { failOn: 'warn' }),
    ).not.toHaveProperty('gate');
    expect(
      narrowReport(
        { ...report, gate: { errorCount: 9, warnCount: 9 } },
        [all[1]!],
        { failOn: 'warn' },
      ).gate,
    ).toEqual({ errorCount: 0, warnCount: 1 });
  });
});

describe('computeConfigHash', () => {
  const input = {
    rules: { b: 'warn' as const, a: 'error' as const },
    include: ['x', 'a'],
    exclude: [],
    respectInlineDisables: true,
    lint: true,
    deadCode: true,
  };
  it('is order-independent and sensitive to every field', () => {
    const h = computeConfigHash(input);
    expect(h).toMatch(/^[0-9a-f]{16}$/);
    expect(
      computeConfigHash({
        ...input,
        rules: { a: 'error', b: 'warn' },
        include: ['a', 'x'],
      }),
    ).toBe(h);
    expect(computeConfigHash({ ...input, deadCode: false })).not.toBe(h);
    expect(computeConfigHash({ ...input, rules: { a: 'warn' } })).not.toBe(h);
  });
  it('folds ignore/surfaces filters in, independent of key order', () => {
    const a = computeConfigHash({
      ...input,
      filters: { ignore: { files: ['x'], rules: ['r'] }, surfaces: undefined },
    });
    const b = computeConfigHash({
      ...input,
      filters: { surfaces: undefined, ignore: { rules: ['r'], files: ['x'] } },
    });
    expect(a).toBe(b);
    expect(a).not.toBe(computeConfigHash(input));
    expect(
      computeConfigHash({ ...input, filters: { ignore: { files: ['y'] } } }),
    ).not.toBe(a);
  });

  it('combines per-project hashes', () => {
    expect(combineConfigHashes(['aa', 'aa'])).toBe('aa');
    expect(combineConfigHashes(['aa', 'bb'])).toBe(
      combineConfigHashes(['bb', 'aa']),
    );
    expect(combineConfigHashes(['aa', 'bb'])).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe('readBaselineReport', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'baseline-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });
  const write = (name: string, value: unknown): string => {
    const file = join(dir, name);
    writeFileSync(
      file,
      typeof value === 'string' ? value : JSON.stringify(value),
    );
    return file;
  };
  const ok = {
    schemaVersion: '1',
    configHash: 'hash',
    diagnostics: [
      { file: 'a.ts', line: 1, ruleId: 'r', message: 'm', fingerprint: 'f' },
    ],
  };

  it('accepts a complete fingerprinted full-scope report', () => {
    expect(readBaselineReport(write('ok.json', ok)).configHash).toBe('hash');
    expect(
      readBaselineReport(write('full.json', { ...ok, scope: { mode: 'full' } }))
        .diagnostics,
    ).toHaveLength(1);
  });

  it.each([
    ['missing.json', undefined, /ENOENT|no such file/],
    ['bad.json', '{not json', /JSON/],
    ['shape.json', { schemaVersion: '2', diagnostics: [] }, /not a doctor/],
    ['cmp.json', { ...ok, baseline: { file: 'x' } }, /baseline comparison/],
    ['inc.json', { ...ok, incomplete: true }, /incomplete/],
    ['scope.json', { ...ok, scope: { mode: 'files' } }, /--scope files/],
    ['nohash.json', { ...ok, configHash: undefined }, /predates/],
    [
      'nofp.json',
      {
        ...ok,
        diagnostics: [{ file: 'a', line: 1, ruleId: 'r', message: 'm' }],
      },
      /predates/,
    ],
  ])('rejects %s', (name, value, pattern) => {
    const file = value === undefined ? join(dir, name) : write(name, value);
    expect(() => readBaselineReport(file)).toThrow(BaselineError);
    expect(() => readBaselineReport(file)).toThrow(pattern);
  });
});

describe('applyBaseline', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'apply-baseline-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('narrows to new findings, keeps the score, and summarizes the delta', async () => {
    const file = join(dir, 'base.json');
    writeFileSync(
      file,
      JSON.stringify({
        schemaVersion: '1',
        configHash: 'hash',
        diagnostics: [
          {
            file: 'a.ts',
            line: 1,
            ruleId: 'vue-doctor/x',
            message: 'm',
            fingerprint: 'fp',
          },
          {
            file: 'gone.ts',
            line: 1,
            ruleId: 'vue-doctor/x',
            message: 'm',
            fingerprint: 'g',
          },
        ],
      }),
    );
    const fresh = diag({ file: '/r/b.ts' });
    const report = reportOf([diag(), fresh]);
    const out = await applyBaseline(report, {
      baselineFile: file,
      failOn: 'error',
    });
    expect(out.diagnostics).toEqual([fresh]);
    expect(out.score).toBe(report.score);
    expect(out.errorCount).toBe(1);
    expect(out.baseline).toEqual({
      file,
      matchedCount: 1,
      newCount: 1,
      fixedCount: 1,
    });
    const scoped = await applyBaseline(report, {
      baselineFile: file,
      failOn: 'error',
      scopeFiles: new Set(['/r/a.ts', '/r/b.ts']),
    });
    // gone.ts is outside the scanned scope: ignored, not "fixed".
    expect(scoped.baseline!.fixedCount).toBe(0);
  });

  it('rejects a baseline produced with different settings', async () => {
    const file = join(dir, 'base.json');
    writeFileSync(
      file,
      JSON.stringify({
        schemaVersion: '1',
        configHash: 'other',
        diagnostics: [],
      }),
    );
    await expect(
      applyBaseline(reportOf([]), { baselineFile: file, failOn: 'error' }),
    ).rejects.toThrow(/different finding-affecting settings/);
  });

  it('follows git renames and line shifts since the baseline revision', async () => {
    const sh = (...args: string[]) =>
      execFileSync('git', args, { cwd: dir, encoding: 'utf-8' });
    sh('init', '-q');
    sh('config', 'user.email', 't@e.com');
    sh('config', 'user.name', 'T');
    mkdirSync(join(dir, 'src'));
    const lines = Array.from({ length: 12 }, (_, i) => `const v${i} = ${i};`);
    writeFileSync(join(dir, 'src', 'old.ts'), `${lines.join('\n')}\n`);
    writeFileSync(join(dir, 'src', 'edited.ts'), `${lines.join('\n')}\n`);
    sh('add', '.');
    sh('commit', '-qm', 'base');
    const revision = sh('rev-parse', 'HEAD').trim();
    sh('mv', 'src/old.ts', 'src/new.ts');
    writeFileSync(
      join(dir, 'src', 'edited.ts'),
      `// a\n// b\n${lines.join('\n')}\n`,
    );
    const baseFile = join(dir, 'base.json');
    writeFileSync(
      baseFile,
      JSON.stringify({
        schemaVersion: '1',
        configHash: 'hash',
        sourceRevision: revision,
        diagnostics: [
          {
            file: 'src/old.ts',
            line: 3,
            ruleId: 'r',
            message: 'm',
            fingerprint: 'a',
          },
          {
            file: 'src/edited.ts',
            line: 5,
            ruleId: 'r',
            message: 'm',
            fingerprint: 'b',
          },
          {
            file: 'src/same.ts',
            line: 2,
            ruleId: 'r',
            message: 'm',
            fingerprint: 's1',
          },
        ],
      }),
    );
    const moved = diag({
      file: join(dir, 'src/new.ts'),
      line: 3,
      ruleId: 'r',
      fingerprint: 'z',
    });
    const shiftedOld = diag({
      file: join(dir, 'src/edited.ts'),
      line: 7,
      ruleId: 'r',
      fingerprint: 'y1',
    });
    const added = diag({
      file: join(dir, 'src/edited.ts'),
      line: 1,
      ruleId: 'r',
      fingerprint: 'y2',
    });
    const same1 = diag({
      file: join(dir, 'src/same.ts'),
      line: 2,
      ruleId: 'r',
      fingerprint: 's2',
    });
    const same2 = diag({
      file: join(dir, 'src/same.ts'),
      line: 9,
      ruleId: 'r',
      fingerprint: 's3',
    });
    const out = await applyBaseline(
      reportOf([moved, shiftedOld, added, same1, same2], { rootDir: dir }),
      {
        baselineFile: baseFile,
        failOn: 'error',
        scopeFiles: new Set(
          ['src/new.ts', 'src/edited.ts', 'src/same.ts'].map((p) =>
            join(dir, p),
          ),
        ),
      },
    );
    expect(out.diagnostics).toEqual([added, same2]);
    expect(out.baseline!.fixedCount).toBe(0);
  });

  it('matches without git help when the revision is unknown', async () => {
    const baseFile = join(dir, 'base.json');
    writeFileSync(
      baseFile,
      JSON.stringify({
        schemaVersion: '1',
        configHash: 'hash',
        sourceRevision: 'deadbeef',
        diagnostics: [
          {
            file: 'a.ts',
            line: 1,
            ruleId: 'vue-doctor/x',
            message: 'm',
            fingerprint: 'fp',
          },
        ],
      }),
    );
    const out = await applyBaseline(reportOf([diag()], { rootDir: '/r' }), {
      baselineFile: baseFile,
      failOn: 'error',
    });
    expect(out.diagnostics).toEqual([]);
    expect(out.exitCode).toBe(0);
  });
});
