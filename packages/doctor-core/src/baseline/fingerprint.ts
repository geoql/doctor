import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import type { Diagnostic } from '../types.js';

/**
 * The source text a diagnostic points at, whitespace-collapsed. A span with an
 * end position yields exactly that span; a point diagnostic yields its whole
 * line. Falls back to the message when the source is unavailable, so every
 * diagnostic still carries a stable identity.
 */
export function diagnosticEvidence(
  diagnostic: Diagnostic,
  lines: readonly string[] | undefined,
): string {
  const startIndex = diagnostic.line - 1;
  const first = lines?.[startIndex];
  let evidence = '';
  if (lines && first !== undefined) {
    if (diagnostic.endLine === undefined) {
      evidence = first;
    } else {
      const endIndex = Math.min(
        Math.max(diagnostic.endLine - 1, startIndex),
        lines.length - 1,
      );
      evidence = lines
        .slice(startIndex, endIndex + 1)
        .map((line, index, span) => {
          const start = index === 0 ? Math.max(0, diagnostic.column - 1) : 0;
          const end =
            index === span.length - 1 && diagnostic.endColumn !== undefined
              ? diagnostic.endColumn - 1
              : undefined;
          return line.slice(start, end);
        })
        .join('\n');
    }
  }
  const collapsed = evidence.replace(/\s+/g, ' ').trim();
  return collapsed.length > 0 ? collapsed : diagnostic.message;
}

/**
 * Stable identity for a diagnostic: rule id + rootDir-relative POSIX path +
 * normalized source evidence. Line and column numbers are deliberately NOT
 * part of it, so unrelated edits that shift code up or down keep the
 * fingerprint unchanged.
 */
export function fingerprintDiagnostic(
  diagnostic: Diagnostic,
  rootDir: string,
  lines: readonly string[] | undefined,
): string {
  const path = relative(rootDir, diagnostic.file).replaceAll('\\', '/');
  const evidence = diagnosticEvidence(diagnostic, lines);
  return createHash('sha256')
    .update(`${diagnostic.ruleId}\0${path}\0${evidence}`)
    .digest('hex');
}

export async function attachFingerprints(
  diagnostics: readonly Diagnostic[],
  rootDir: string,
): Promise<Diagnostic[]> {
  const cache = new Map<string, string[] | undefined>();
  const out: Diagnostic[] = [];
  for (const d of diagnostics) {
    if (!cache.has(d.file)) {
      try {
        cache.set(d.file, (await readFile(d.file, 'utf-8')).split('\n'));
      } catch {
        cache.set(d.file, undefined);
      }
    }
    out.push({
      ...d,
      fingerprint: fingerprintDiagnostic(d, rootDir, cache.get(d.file)),
    });
  }
  return out;
}
