import { DiagnosticSeverity } from 'vscode-languageserver';
import type { Severity } from '@geoql/doctor-core';

/**
 * Maps doctor-core's internal severity vocabulary (`error | warn | info`) to
 * the LSP `DiagnosticSeverity` enum: `error → Error`, `warn → Warning`,
 * `info → Information`. Doctor never emits LSP `Hint`.
 */
export const toLspSeverity = (severity: Severity): DiagnosticSeverity => {
  switch (severity) {
    case 'error':
      return DiagnosticSeverity.Error;
    case 'warn':
      return DiagnosticSeverity.Warning;
    case 'info':
      return DiagnosticSeverity.Information;
  }
};

/**
 * Human-readable label for an LSP diagnostic's severity. Covers all four LSP
 * severities so a value outside doctor's vocabulary isn't mislabeled.
 */
export const severityLabel = (
  severity: DiagnosticSeverity | undefined,
): string => {
  switch (severity) {
    case DiagnosticSeverity.Error:
      return 'error';
    case DiagnosticSeverity.Information:
      return 'info';
    case DiagnosticSeverity.Hint:
      return 'hint';
    default:
      return 'warning';
  }
};
