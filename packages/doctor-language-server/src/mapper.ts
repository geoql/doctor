import { docsUrl } from '@geoql/doctor-core';
import type { Diagnostic as CoreDiagnostic } from '@geoql/doctor-core';
import type { Diagnostic as LspDiagnostic } from 'vscode-languageserver';
import { DIAGNOSTIC_SOURCE } from './constants.js';
import { rangeFromLineColumn } from './positions.js';
import { toLspSeverity } from './severity.js';

export interface MapDiagnosticInput {
  readonly diagnostic: CoreDiagnostic;
  /** Text of the diagnostic's file for end-of-line range fallback; `null` → single column. */
  readonly text: string | null;
}

/**
 * Converts a core doctor `Diagnostic` into an LSP `Diagnostic` with a precise
 * 0-based range, `source: 'doctor'`, `code: ruleId`, a `codeDescription`
 * pointing at the rule's docs page, and the recommendation appended to the
 * message when present.
 */
export const toLspDiagnostic = (input: MapDiagnosticInput): LspDiagnostic => {
  const { diagnostic, text } = input;
  const range = rangeFromLineColumn(
    text,
    diagnostic.line,
    diagnostic.column,
    diagnostic.endLine,
    diagnostic.endColumn,
  );

  return {
    range,
    severity: toLspSeverity(diagnostic.severity),
    code: diagnostic.ruleId,
    codeDescription: { href: docsUrl(diagnostic.ruleId) },
    source: DIAGNOSTIC_SOURCE,
    message: diagnostic.message,
  };
};
