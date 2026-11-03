import type { AuditReport } from './types.js';

export const MIN_WARNING_EXIT_CODE = 2;
export const MAX_WARNING_EXIT_CODE = 255;

/**
 * Parse the `--warning-exit-code <code>` CLI value. Accepts a plain decimal
 * integer in 2-255: 0 and 1 already mean pass/fail, and POSIX exit statuses
 * cap at 255. Anything else throws so the CLI exits 2 instead of silently
 * falling back.
 */
export function parseWarningExitCode(value: string | number): number {
  const raw = String(value);
  const code = Number(raw);
  if (
    !/^\d+$/.test(raw) ||
    code < MIN_WARNING_EXIT_CODE ||
    code > MAX_WARNING_EXIT_CODE
  ) {
    throw new Error(
      `--warning-exit-code must be an integer from ${MIN_WARNING_EXIT_CODE} to ${MAX_WARNING_EXIT_CODE}, got "${raw}".`,
    );
  }
  return code;
}

export interface ResolveExitCodeOptions {
  readonly failOn: 'error' | 'warn' | 'none';
  readonly warningExitCode?: number;
}

/**
 * Final process exit code for an audit. Without `warningExitCode` this is
 * `report.exitCode` verbatim. With it, a run whose gate-relevant findings
 * are warnings only (no errors) exits with that code instead of 0 / 1, so a
 * CI job can tell "warnings only" apart from a hard failure (e.g. GitLab
 * `allow_failure.exit_codes`). Errors still exit 1, a crashed pass still
 * exits 2, and `failOn: 'none'` keeps the run advisory (exit 0).
 */
export function resolveExitCode(
  report: Pick<AuditReport, 'exitCode' | 'errorCount' | 'warnCount' | 'gate'>,
  options: ResolveExitCodeOptions,
): number {
  if (report.exitCode === 2) return 2;
  if (options.warningExitCode === undefined) return report.exitCode;
  if (options.failOn === 'none') return report.exitCode;
  const counts = report.gate ?? report;
  if (counts.errorCount > 0) return report.exitCode;
  if (counts.warnCount > 0) return options.warningExitCode;
  return report.exitCode;
}
