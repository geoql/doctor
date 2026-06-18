import type {
  AuditReport,
  Diagnostic as CoreDiagnostic,
} from '@geoql/doctor-core';
import type { Diagnostic as LspDiagnostic } from 'vscode-languageserver';
import { toLspDiagnostic } from './mapper.js';
import { diagnosticFileToUri } from './uri.js';

export interface GroupDiagnosticsInput {
  readonly report: AuditReport;
  /**
   * Returns the live text for a diagnostic's file (open buffer first, then
   * disk) so range fallback can extend to end-of-line; `null` when unknown.
   */
  readonly textForFile: (file: string) => string | null;
  /**
   * URIs that previously held diagnostics and must be republished even when
   * the new audit found nothing in them — otherwise stale squiggles linger.
   */
  readonly previousUris?: Iterable<string>;
}

/**
 * Transforms an `AuditReport` into a per-URI map of LSP diagnostics. Every
 * URI in `previousUris` that has no findings this pass is included with an
 * empty array so the server can clear it. Grouping is keyed by the resolved
 * `file://` URI of each diagnostic's `file`.
 */
export const groupDiagnosticsByUri = (
  input: GroupDiagnosticsInput,
): Map<string, LspDiagnostic[]> => {
  const { report, textForFile, previousUris } = input;
  const byUri = new Map<string, LspDiagnostic[]>();

  for (const uri of previousUris ?? []) {
    byUri.set(uri, []);
  }

  const textCache = new Map<string, string | null>();
  const readText = (file: string): string | null => {
    const cached = textCache.get(file);
    if (cached !== undefined) return cached;
    const text = textForFile(file);
    textCache.set(file, text);
    return text;
  };

  for (const diagnostic of report.diagnostics) {
    appendDiagnostic(byUri, report.rootDir, diagnostic, readText);
  }

  return byUri;
};

const appendDiagnostic = (
  byUri: Map<string, LspDiagnostic[]>,
  rootDir: string,
  diagnostic: CoreDiagnostic,
  readText: (file: string) => string | null,
): void => {
  const uri = diagnosticFileToUri(rootDir, diagnostic.file);
  const lsp = toLspDiagnostic({ diagnostic, text: readText(diagnostic.file) });
  const existing = byUri.get(uri);
  if (existing) existing.push(lsp);
  else byUri.set(uri, [lsp]);
};
