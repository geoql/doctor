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
      warningCount: 0,
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
          severity: 'warning',
          message: 'warning message here',
        }),
      ],
      score: 88,
      errorCount: 2,
      warningCount: 3,
      exitCode: 1,
    };
    const out = format(report, 'text');
    expect(out).toContain('src/a.vue');
    expect(out).toContain('src/b.vue');
    expect(out).toContain('error');
    expect(out).toContain('warning');
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
      warningCount: 1,
      exitCode: 1,
    };
    const out = format(report, 'text');
    expect(out).toContain('1 error, 1 warning in 1 file');
    expect(out).not.toContain('hint:');
  });

  it('falls back to absolute path when relative resolves empty', () => {
    const report: AuditReport = {
      rootDir: '/proj/src/a.vue',
      filesScanned: 1,
      diagnostics: [diag({ file: '/proj/src/a.vue' })],
      score: 90,
      errorCount: 1,
      warningCount: 0,
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
      warningCount: 0,
      exitCode: 0,
    };
    const out = format(report, 'text');
    expect(out).toContain('0 errors, 0 warnings in 0 files');
    expect(out).toContain('Score:');
  });
});
