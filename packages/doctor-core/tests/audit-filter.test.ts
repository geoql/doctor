import { describe, it, expect } from 'vitest';
import type { AuditReport } from '../src/types.js';
import { filterReportByRules } from '../src/audit-filter.js';

function diag(
  ruleId: string,
  severity: 'error' | 'warn' | 'info',
): AuditReport['diagnostics'][number] {
  return {
    file: 'src/Foo.vue',
    line: 1,
    column: 1,
    endLine: 1,
    endColumn: 2,
    ruleId,
    severity,
    src: 'lint',
    msg: `violation of ${ruleId}`,
  };
}

function makeReport(
  diagnostics: AuditReport['diagnostics'],
  overrides: Partial<AuditReport> = {},
): AuditReport {
  const bySeverity = { error: 0, warn: 0, info: 0 };
  for (const d of diagnostics) bySeverity[d.severity] += 1;
  return {
    rootDir: '/repo',
    filesScanned: 1,
    diagnostics,
    score: 100,
    errorCount: bySeverity.error,
    warnCount: bySeverity.warn,
    infoCount: bySeverity.info,
    exitCode: 0,
    scoreResult: {
      score: 100,
      passed: true,
      threshold: 0,
      totalFindings: diagnostics.length,
      errorCount: bySeverity.error,
      warnCount: bySeverity.warn,
      infoCount: bySeverity.info,
      breakdown: [],
      bySeverity,
    },
    projectInfo: {
      framework: 'vue',
      vueVersion: '3',
      nuxtVersion: null,
      capabilities: [],
      rootDirectory: '/repo',
    },
    elapsedMs: 0,
    timings: {
      scan: 0,
      lint: 0,
      deadCode: 0,
      buildQuality: 0,
      deps: 0,
    },
    ruleCounts: diagnostics.reduce<Record<string, number>>((acc, d) => {
      acc[d.ruleId] = (acc[d.ruleId] ?? 0) + 1;
      return acc;
    }, {}),
    ...overrides,
  };
}

describe('filterReportByRules', () => {
  it('removes diagnostics whose ruleId is not in the allowed set, then rescores so counts match the array', () => {
    const report = makeReport([
      diag('vue/no-em-dash-in-string', 'warn'),
      diag('dead-code/unused-dep', 'info'),
    ]);
    const filtered = filterReportByRules(
      report,
      new Set(['vue/no-em-dash-in-string']),
    );
    expect(filtered.diagnostics).toHaveLength(1);
    expect(filtered.diagnostics[0]?.ruleId).toBe('vue/no-em-dash-in-string');
    expect(filtered.errorCount + filtered.warnCount + filtered.infoCount).toBe(
      filtered.diagnostics.length,
    );
    expect(filtered.warnCount).toBe(1);
    expect(filtered.infoCount).toBe(0);
  });

  it('recovers the score from the filtered diagnostics (suppressed findings no longer penalize)', () => {
    const report = makeReport([
      diag('vue/no-em-dash-in-string', 'warn'),
      diag('dead-code/unused-dep', 'info'),
    ]);
    const filtered = filterReportByRules(
      report,
      new Set(['vue/no-em-dash-in-string']),
    );
    expect(filtered.scoreResult.breakdown.map((b) => b.ruleId)).toEqual([
      'vue/no-em-dash-in-string',
    ]);
    expect(filtered.scoreResult.totalFindings).toBe(1);
  });

  it('preserves exitCode=2 (oxlint crash) through the filter', () => {
    const report = makeReport([diag('vue/no-em-dash-in-string', 'error')], {
      exitCode: 2,
    });
    const filtered = filterReportByRules(
      report,
      new Set(['vue/no-em-dash-in-string']),
      'error',
      'Failed to load plugin',
    );
    expect(filtered.exitCode).toBe(2);
  });

  it('drops exitCode from 1 to 0 when failOn=warn and all warn diagnostics are filtered out', () => {
    const report = makeReport(
      [
        diag('vue/no-em-dash-in-string', 'warn'),
        diag('vue/no-em-dash-in-string', 'warn'),
      ],
      { exitCode: 1 },
    );
    const filtered = filterReportByRules(
      report,
      new Set(['other-rule']),
      'warn',
    );
    expect(filtered.exitCode).toBe(0);
  });

  it('keeps exitCode=1 when failOn=warn and warns survive the filter', () => {
    const report = makeReport(
      [
        diag('vue/no-em-dash-in-string', 'warn'),
        diag('dead-code/unused-dep', 'info'),
      ],
      { exitCode: 1 },
    );
    const filtered = filterReportByRules(
      report,
      new Set(['vue/no-em-dash-in-string']),
      'warn',
    );
    expect(filtered.exitCode).toBe(1);
  });

  it('recomputes ruleCounts from the filtered diagnostics', () => {
    const report = makeReport([
      diag('vue/no-em-dash-in-string', 'warn'),
      diag('vue/no-em-dash-in-string', 'warn'),
      diag('dead-code/unused-dep', 'info'),
    ]);
    const filtered = filterReportByRules(
      report,
      new Set(['vue/no-em-dash-in-string']),
    );
    expect(filtered.ruleCounts).toEqual({ 'vue/no-em-dash-in-string': 2 });
  });

  it('preserves the original score threshold (does not reset to 0)', () => {
    const report = makeReport([diag('vue/no-em-dash-in-string', 'error')], {
      scoreResult: {
        score: 95,
        passed: false,
        threshold: 90,
        totalFindings: 1,
        errorCount: 1,
        warnCount: 0,
        infoCount: 0,
        breakdown: [],
        bySeverity: { error: 1, warn: 0, info: 0 },
      },
    });
    const filtered = filterReportByRules(
      report,
      new Set(['vue/no-em-dash-in-string']),
    );
    expect(filtered.scoreResult.threshold).toBe(90);
  });

  it('forces exitCode to 0 when failOn=none, even with surviving error diagnostics', () => {
    const report = makeReport([diag('vue/no-em-dash-in-string', 'error')], {
      exitCode: 1,
    });
    const filtered = filterReportByRules(
      report,
      new Set(['vue/no-em-dash-in-string']),
      'none',
    );
    expect(filtered.exitCode).toBe(0);
  });

  it('preserves the empty-allowed-set case (filter drops everything, score 100, counts all 0)', () => {
    const report = makeReport([
      diag('vue/no-em-dash-in-string', 'warn'),
      diag('dead-code/unused-dep', 'error'),
    ]);
    const filtered = filterReportByRules(report, new Set());
    expect(filtered.diagnostics).toHaveLength(0);
    expect(filtered.errorCount).toBe(0);
    expect(filtered.warnCount).toBe(0);
    expect(filtered.infoCount).toBe(0);
    expect(filtered.score).toBe(100);
    expect(filtered.exitCode).toBe(0);
  });
});
