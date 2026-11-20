import { scoredSurfaceDiagnostics } from './test-surface.js';
import type { AuditReport, Diagnostic } from './types.js';

type FindingSets = Pick<
  AuditReport,
  'diagnostics' | 'scoredDiagnostics' | 'gatedDiagnostics'
>;

/** The findings a report's score and severity counts cover. */
export function scoredFindings(
  report: FindingSets,
  includeTestFiles: boolean,
): Diagnostic[] {
  return (
    report.scoredDiagnostics ??
    scoredSurfaceDiagnostics(report.diagnostics, includeTestFiles)
  );
}

/** The findings a report's `--fail-on` gate sees. */
export function gatedFindings(
  report: FindingSets,
  includeTestFiles: boolean,
): Diagnostic[] {
  return (
    report.gatedDiagnostics ??
    scoredSurfaceDiagnostics(report.diagnostics, includeTestFiles)
  );
}
