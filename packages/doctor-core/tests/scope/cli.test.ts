import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  applyScopePlan,
  finishScopedReport,
  mergeScopeParts,
  scopeRequestFromFlags,
} from '../../src/scope/cli.js';
import {
  addedLineRanges,
  createLinesMatcher,
  diagnosticRange,
} from '../../src/scope/match.js';
import { resolveScopePlan, type ScopePlan } from '../../src/scope/resolve.js';
import { scoreDiagnostics } from '../../src/score.js';
import type { AuditReport, Diagnostic } from '../../src/types.js';

function diag(overrides: Partial<Diagnostic> = {}): Diagnostic {
  return {
    file: '/r/src/a.ts',
    line: 1,
    column: 1,
    ruleId: 'r/x',
    severity: 'error',
    message: 'm',
    source: 'oxlint',
    ...overrides,
  };
}

function reportOf(diagnostics: Diagnostic[], rootDir = '/r'): AuditReport {
  const scoreResult = scoreDiagnostics(diagnostics, { threshold: 0 });
  return {
    rootDir,
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
      rootDirectory: rootDir,
    },
    elapsedMs: 1,
    timings: { template: 0, sfc: 0, script: 0, deadCode: 0, total: 1 },
    ruleCounts: {},
    incomplete: false,
  };
}

describe('scopeRequestFromFlags', () => {
  it('maps deprecated selectors onto --scope files', () => {
    expect(scopeRequestFromFlags({ diff: true })).toEqual({
      mode: 'files',
      legacy: 'diff',
      includeUntracked: false,
    });
    expect(
      scopeRequestFromFlags({
        changedFilesFrom: 'main',
        includeUntracked: true,
      }),
    ).toEqual({
      mode: 'files',
      base: 'main',
      legacy: 'changed-files-from',
      includeUntracked: true,
    });
    expect(scopeRequestFromFlags({ staged: true })).toEqual({
      mode: 'files',
      staged: true,
      includeUntracked: false,
    });
  });

  it('resolves --scope / --base with config defaults, flags winning', () => {
    expect(scopeRequestFromFlags({})).toEqual({
      mode: 'full',
      includeUntracked: false,
    });
    expect(
      scopeRequestFromFlags({}, { scope: 'lines', base: 'origin/main' }),
    ).toEqual({ mode: 'lines', base: 'origin/main', includeUntracked: false });
    expect(
      scopeRequestFromFlags(
        { scope: 'changed', base: 'dev' },
        { scope: 'lines', base: 'origin/main' },
      ),
    ).toEqual({ mode: 'changed', base: 'dev', includeUntracked: false });
    expect(
      scopeRequestFromFlags({ scope: 'lines', staged: true }, { base: 'x' }),
    ).toEqual({ mode: 'lines', staged: true, includeUntracked: false });
    expect(scopeRequestFromFlags({ full: true, scope: 'lines' })).toEqual({
      mode: 'full',
    });
  });

  it.each([
    [{ diff: true, staged: true }, /mutually exclusive/],
    [{ scope: 'everything' }, /--scope must be one of/],
    [{ scope: 'lines', diff: true }, /cannot be combined/],
    [{ base: 'x', changedFilesFrom: 'y' }, /cannot be combined/],
    [{ staged: true, base: 'x' }, /drop --base/],
  ])('rejects %o', (flags, pattern) => {
    expect(() => scopeRequestFromFlags(flags)).toThrow(pattern);
  });
});

describe('line matching', () => {
  const change = {
    path: 'src/a.ts',
    oldPath: 'src/a.ts',
    status: 'modified' as const,
    hunks: [
      { oldStart: 1, oldCount: 1, newStart: 3, newCount: 2 },
      { oldStart: 9, oldCount: 2, newStart: 10, newCount: 0 },
    ],
  };

  it('keeps only diagnostics whose span touches an added line', () => {
    expect(addedLineRanges(change)).toEqual([[3, 4]]);
    expect(diagnosticRange(diag({ line: 5, endLine: 2 }))).toEqual([5, 5]);
    const keep = createLinesMatcher('/r', [change]);
    expect(keep(diag({ line: 4 }))).toBe(true);
    expect(keep(diag({ line: 1, endLine: 3 }))).toBe(true);
    expect(keep(diag({ line: 5 }))).toBe(false);
    expect(keep(diag({ file: '/r/src/other.ts', line: 3 }))).toBe(false);
  });
});

describe('applyScopePlan / finishScopedReport', () => {
  const gate = { failOn: 'error' as const };
  const plan = (mode: ScopePlan['mode']): ScopePlan => ({
    mode,
    base: 'main',
    diffBase: 'abc',
    changes: [
      {
        path: 'src/a.ts',
        oldPath: 'src/a.ts',
        status: 'modified',
        hunks: [{ oldStart: 2, oldCount: 1, newStart: 2, newCount: 1 }],
      },
    ],
    files: ['/r/src/a.ts'],
  });
  const never = async (): Promise<AuditReport> => {
    throw new Error('not expected');
  };

  it('tags files scope without narrowing', async () => {
    const out = await applyScopePlan(reportOf([diag()]), plan('files'), {
      rootDir: '/r',
      auditBase: never,
    });
    expect(out.report.scope).toEqual({ mode: 'files', base: 'main' });
    expect(out.keep).toBeUndefined();
    expect(finishScopedReport(out.report, gate)).toBe(out.report);
  });

  it('defers line narrowing, preserving the changed-files score', async () => {
    const onLine = diag({ line: 2 });
    const off = diag({ line: 7, severity: 'warn' });
    const report = reportOf([onLine, off]);
    const out = await applyScopePlan(report, plan('lines'), {
      rootDir: '/r',
      auditBase: never,
    });
    const done = finishScopedReport(out.report, { ...gate, keep: out.keep! });
    expect(done.diagnostics).toEqual([onLine]);
    expect(done.score).toBe(report.score);
    expect(done.warnCount).toBe(0);
  });

  it('skips the base comparison for changed when a baseline replaces it', async () => {
    const out = await applyScopePlan(
      reportOf([diag()]),
      { ...plan('changed'), base: undefined },
      { rootDir: '/r', skipBaseComparison: true, auditBase: never },
    );
    expect(out.report.scope).toEqual({ mode: 'changed' });
    expect(out.keep).toBeUndefined();
  });

  describe('changed scope against a real base revision', () => {
    let dir: string;
    const git = (...args: string[]): string =>
      execFileSync('git', args, { cwd: dir, encoding: 'utf-8' }).trim();
    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'scope-changed-'));
      git('init', '-q', '-b', 'main');
      git('config', 'user.email', 't@e.com');
      git('config', 'user.name', 'T');
      mkdirSync(join(dir, 'src'));
      writeFileSync(
        join(dir, 'src', 'old.ts'),
        'bad(); // renamed\nexport const renamed = 1;\n',
      );
      writeFileSync(join(dir, 'src', 'keep.ts'), 'bad(); // a\n');
      git('add', '.');
      git('commit', '-qm', 'base');
    });
    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    it('reports only findings the change introduced, following renames', async () => {
      git('mv', 'src/old.ts', 'src/new.ts');
      writeFileSync(
        join(dir, 'src', 'keep.ts'),
        '// moved\nbad(); // a\nbad(); // b\n',
      );
      writeFileSync(join(dir, 'src', 'added.ts'), 'bad(); // added\n');
      const resolved = await resolveScopePlan(dir, {
        mode: 'changed',
        base: 'main',
        includeUntracked: true,
      });
      // A fake auditor: one finding per `bad();` line.
      const scan = (root: string, files: readonly string[]): Diagnostic[] =>
        files
          .flatMap((file) =>
            execFileSync('cat', [file], { encoding: 'utf-8' })
              .split('\n')
              .flatMap((text, i) =>
                text.startsWith('bad();')
                  ? [
                      diag({
                        file,
                        line: i + 1,
                        message: 'bad',
                        fingerprint: text,
                      }),
                    ]
                  : [],
              ),
          )
          .map((d) => ({ ...d, file: resolve(root, d.file) }));
      const head = reportOf(scan(dir, resolved!.files), dir);
      const out = await applyScopePlan(head, resolved!, {
        rootDir: dir,
        auditBase: async (root, files) => {
          const report = reportOf(scan(root, files), root);
          // findings outside the snapshot are ignored
          report.diagnostics.push(diag({ file: '/elsewhere/x.ts' }));
          return report;
        },
      });
      const done = finishScopedReport(out.report, { ...gate, ...out });
      expect(
        done.diagnostics.map((d) => `${d.file.slice(dir.length)}:${d.line}`),
      ).toEqual(['/src/added.ts:1', '/src/keep.ts:3']);
      // keep.ts gained a finding; its pre-existing one shifted down a line.
      expect(done.baseline).toEqual({
        file: 'git:main',
        matchedCount: 2,
        newCount: 2,
        fixedCount: 0,
      });
      expect(done.score).toBe(head.score);
    });

    it('skips the base audit when every staged file is new', async () => {
      writeFileSync(join(dir, 'src', 'added.ts'), 'bad();\n');
      git('add', 'src/added.ts');
      const resolved = await resolveScopePlan(dir, {
        mode: 'changed',
        staged: true,
      });
      const head = reportOf([diag({ file: join(dir, 'src/added.ts') })], dir);
      const out = await applyScopePlan(head, resolved!, {
        rootDir: dir,
        auditBase: never,
      });
      expect(out.summary).toMatchObject({ file: 'git:HEAD', newCount: 1 });
    });
  });
});

describe('mergeScopeParts', () => {
  it('unions files and filters and sums summaries', () => {
    expect(mergeScopeParts([{}, {}])).toEqual({});
    const a = diag({ line: 1 });
    const b = diag({ line: 2 });
    const merged = mergeScopeParts([
      {
        scopeFiles: ['/a'],
        keep: (d) => d === a,
        summary: {
          file: 'git:main',
          matchedCount: 1,
          newCount: 2,
          fixedCount: 3,
        },
      },
      { scopeFiles: ['/b'], keep: (d) => d === b },
      {
        scopeFiles: [],
        summary: {
          file: 'git:main',
          matchedCount: 1,
          newCount: 1,
          fixedCount: 1,
        },
      },
      {},
    ]);
    expect(merged.scopeFiles).toEqual(['/a', '/b']);
    expect([merged.keep!(a), merged.keep!(b), merged.keep!(diag())]).toEqual([
      true,
      true,
      false,
    ]);
    expect(merged.summary).toEqual({
      file: 'git:main',
      matchedCount: 2,
      newCount: 3,
      fixedCount: 4,
    });
    expect(mergeScopeParts([{ scopeFiles: ['/a'] }])).toEqual({
      scopeFiles: ['/a'],
    });
  });
});
