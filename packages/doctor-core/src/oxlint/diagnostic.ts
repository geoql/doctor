import { resolve } from 'node:path';
import type { Diagnostic } from '../types.js';
import type { OxlintRawDiagnostic } from './types.js';

const OXLINT_CODE_PATTERN = /^([a-z0-9_-]+)\(([a-z0-9_-]+)\)$/i;

export function normalizeOxlintRuleId(raw: OxlintRawDiagnostic): string {
  if (raw.code) {
    const match = OXLINT_CODE_PATTERN.exec(raw.code);
    if (match) return `${match[1]}/${match[2]}`;
    return raw.code;
  }
  if (raw.rule) return raw.rule;
  return 'oxlint/unknown';
}

export function toCanonicalDiagnostic(
  raw: OxlintRawDiagnostic,
  rootDir: string,
): Diagnostic {
  const ruleId = normalizeOxlintRuleId(raw);
  const severity = raw.severity === 'warning' ? 'warn' : 'error';
  const primary = raw.labels?.[0]?.span;
  const line = primary?.line ?? raw.start_line ?? 1;
  const column = primary?.column ?? raw.start_column ?? 1;
  return {
    file: resolve(rootDir, raw.filename),
    line,
    column,
    endLine: raw.end_line,
    endColumn: raw.end_column,
    ruleId,
    severity,
    message: raw.message,
    source: 'oxlint',
  };
}

export function toCanonicalDiagnostics(
  raws: OxlintRawDiagnostic[],
  rootDir: string,
): Diagnostic[] {
  return raws.map((r) => toCanonicalDiagnostic(r, rootDir));
}
