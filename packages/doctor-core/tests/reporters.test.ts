import { describe, expect, it } from 'vitest';
import { format } from '../src/reporters/index.js';
import type { AuditReport, Diagnostic } from '../src/types.js';

function diag(overrides: Partial<Diagnostic>): Diagnostic {
  return {
    file: '/proj/src/a.vue',
    line: 1,
    column: 1,
    ruleId: 'r',
    severity: 'error',
    message: 'm',
    source: 'template',
    ...overrides,
  };
}

describe('format json', () => {
  it('produces pretty, round-trippable JSON', () => {
    const report: AuditReport = {
      rootDir: '/proj',
      filesScanned: 1,
      diagnostics: [diag({})],
      score: 90,
      errorCount: 1,
      warnCount: 0,
      infoCount: 0,
      exitCode: 1,
    };
    const out = format(report, 'json');
    expect(out).toContain('\n');
    expect(JSON.parse(out)).toEqual(report);
  });
});

describe('format text', () => {
  it('renders grouped diagnostics with severity, hints, and plural summary', () => {
    const report: AuditReport = {
      rootDir: '/proj',
      filesScanned: 2,
      diagnostics: [
        diag({
          file: '/proj/src/a.vue',
          line: 3,
          column: 5,
          severity: 'error',
          message: 'error message here',
          recommendation: 'fix it this way',
        }),
        diag({
          file: '/proj/src/b.vue',
          line: 7,
          column: 2,
          severity: 'warn',
          message: 'warning message here',
        }),
      ],
      score: 88,
      errorCount: 2,
      warnCount: 3,
      infoCount: 0,
      exitCode: 1,
    };
    const out = format(report, 'text');
    expect(out).toContain('src/a.vue');
    expect(out).toContain('src/b.vue');
    expect(out).toContain('error');
    expect(out).toContain('warn');
    expect(out).toContain('error message here');
    expect(out).toContain('warning message here');
    expect(out).toContain('fix it this way');
    expect(out).toContain('Score:');
    expect(out).toContain('88');
    expect(out).toContain('2 errors, 3 warnings in 2 files');
  });

  it('uses singular summary forms and omits hint when no recommendation', () => {
    const report: AuditReport = {
      rootDir: '/proj',
      filesScanned: 1,
      diagnostics: [
        diag({
          severity: 'error',
          message: 'lonely',
          recommendation: undefined,
        }),
      ],
      score: 90,
      errorCount: 1,
      warnCount: 1,
      infoCount: 0,
      exitCode: 1,
    };
    const out = format(report, 'text');
    expect(out).toContain('1 error, 1 warning in 1 file');
    expect(out).not.toContain('hint:');
  });

  it('renders info severity with cyan', () => {
    const report: AuditReport = {
      rootDir: '/proj',
      filesScanned: 1,
      diagnostics: [
        diag({
          severity: 'info',
          message: 'info message here',
        }),
      ],
      score: 100,
      errorCount: 0,
      warnCount: 0,
      infoCount: 1,
      exitCode: 0,
    };
    const out = format(report, 'text');
    expect(out).toContain('info');
    expect(out).toContain('1 info in 1 file');
  });

  it('renders all three severity counts', () => {
    const report: AuditReport = {
      rootDir: '/proj',
      filesScanned: 3,
      diagnostics: [
        diag({ severity: 'error', message: 'e' }),
        diag({ severity: 'warn', message: 'w' }),
        diag({ severity: 'info', message: 'i' }),
      ],
      score: 92,
      errorCount: 1,
      warnCount: 1,
      infoCount: 1,
      exitCode: 1,
    };
    const out = format(report, 'text');
    expect(out).toContain('1 error, 1 warning, 1 info in 3 files');
  });

  it('falls back to absolute path when relative resolves empty', () => {
    const report: AuditReport = {
      rootDir: '/proj/src/a.vue',
      filesScanned: 1,
      diagnostics: [diag({ file: '/proj/src/a.vue' })],
      score: 90,
      errorCount: 1,
      warnCount: 0,
      infoCount: 0,
      exitCode: 1,
    };
    const out = format(report, 'text');
    expect(out).toContain('/proj/src/a.vue');
  });

  it('defaults to text format for unknown kinds', () => {
    const report: AuditReport = {
      rootDir: '/proj',
      filesScanned: 0,
      diagnostics: [],
      score: 100,
      errorCount: 0,
      warnCount: 0,
      infoCount: 0,
      exitCode: 0,
    };
    const out = format(report, 'text');
    expect(out).toContain('0 errors, 0 warnings, 0 infos in 0 files');
    expect(out).toContain('Score:');
  });
});
