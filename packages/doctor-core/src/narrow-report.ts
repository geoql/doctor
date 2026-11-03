import type { AuditReport, Diagnostic } from './types.js';

export interface NarrowReportOptions {
  readonly failOn: 'error' | 'warn' | 'none';
  readonly includeTestFiles?: boolean;
}

/**
 * Narrow a report to a subset of its findings (the new ones vs a baseline,
 * or the ones on changed lines) WITHOUT touching the score.
 *
 * The score — plus its `breakdown` / `byDimension` explanation and the
 * threshold `passed` verdict — stays computed over the report's full current
 * findings with the unchanged √-decay formula. Everything a gate or summary
 * reads (displayed diagnostics, severity counts, `ruleCounts`, the `--fail-on`
 * exit code) is recomputed from the kept subset only. An oxlint-crash exit 2
 * is preserved.
 */
export function narrowReport(
  report: AuditReport,
  kept: readonly Diagnostic[],
  options: NarrowReportOptions,
): AuditReport {
  const scored = options.includeTestFiles
    ? kept
    : kept.filter((d) => d.surface !== 'test');
  let errorCount = 0;
  let warnCount = 0;
  let infoCount = 0;
  for (const d of scored) {
    if (d.severity === 'error') errorCount += 1;
    else if (d.severity === 'warn') warnCount += 1;
    else infoCount += 1;
  }
  const ruleCounts: Record<string, number> = {};
  for (const d of kept) ruleCounts[d.ruleId] = (ruleCounts[d.ruleId] ?? 0) + 1;

  let exitCode: 0 | 1 | 2 = report.exitCode;
  if (exitCode !== 2) {
    const tripping =
      options.failOn === 'none'
        ? 0
        : options.failOn === 'warn'
          ? errorCount + warnCount
          : errorCount;
    exitCode = tripping > 0 ? 1 : 0;
  }

  return {
    ...report,
    diagnostics: [...kept],
    errorCount,
    warnCount,
    infoCount,
    scoreResult: {
      ...report.scoreResult,
      totalFindings: scored.length,
      errorCount,
      warnCount,
      infoCount,
    },
    ruleCounts,
    exitCode,
    ...(report.gate ? { gate: { errorCount, warnCount } } : {}),
  };
}
