import { scoreDiagnostics } from './score.js';
import type { AuditReport, Diagnostic } from './types.js';

/**
 * Filter `report.diagnostics` to a known set of allowed rule ids, then
 * recompute `score`, `errorCount`, `warnCount`, `infoCount`, `scoreResult`,
 * `ruleCounts`, and `exitCode` from the filtered array.
 *
 * Why: the CLI layer calls `audit()` and then applies its own
 * `allowedRuleIds` filter to drop suppressed (`off`) and preset-excluded
 * (`info` rules not in `recommended`) diagnostics. The audit's own
 * `score`/`counts` are computed BEFORE the CLI filter, so they still
 * include the suppressed findings. That desync surfaces to consumers
 * (the SaaS `--push` payload, the dashboard's counts-but-no-findings bug)
 * and to the `score` itself (suppressed findings still penalize).
 *
 * Invariant enforced here:
 *   report.errorCount + report.warnCount + report.infoCount === report.diagnostics.length
 *   report.scoreResult.totalFindings === report.diagnostics.length
 *
 * `exitCode=2` (oxlint crash) is preserved verbatim; `exitCode=1` is
 * recomputed from the surviving counts + the `failOn` gate.
 */
export function filterReportByRules(
  report: AuditReport,
  allowedRuleIds: ReadonlySet<string>,
  failOn: 'error' | 'warn' | 'none' = 'error',
  oxlintStderr?: string,
): AuditReport {
  const filtered: Diagnostic[] = [];
  for (const d of report.diagnostics) {
    if (allowedRuleIds.has(d.ruleId)) filtered.push(d);
  }

  const threshold = report.scoreResult.threshold;
  const scoreResult = scoreDiagnostics(filtered, { threshold });

  const ruleCounts: Record<string, number> = {};
  for (const d of filtered) {
    ruleCounts[d.ruleId] = (ruleCounts[d.ruleId] ?? 0) + 1;
  }

  let exitCode: 0 | 1 | 2 = report.exitCode;
  if (exitCode !== 2) {
    if (failOn === 'none') {
      exitCode = 0;
    } else {
      const tripping =
        failOn === 'warn'
          ? scoreResult.errorCount + scoreResult.warnCount
          : scoreResult.errorCount;
      exitCode = tripping > 0 ? 1 : 0;
    }
  }
  // When the audit reported an oxlint-crash exit=2 it usually also set
  // scoreResult.keepResultFromOxlint — not applicable here, the helper
  // just preserves exit=2 unchanged when stderr indicates the crash.
  // (The oxlintStderr parameter is kept for forward-compatibility: the
  // CLI passes the same stderr it saw and we don't second-guess exit=2.)
  void oxlintStderr;

  return {
    ...report,
    diagnostics: filtered,
    score: scoreResult.score,
    errorCount: scoreResult.errorCount,
    warnCount: scoreResult.warnCount,
    infoCount: scoreResult.infoCount,
    scoreResult,
    ruleCounts,
    exitCode,
  };
}
