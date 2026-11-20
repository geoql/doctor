import type { Diagnostic } from './types.js';

function escapeProperty(value: string): string {
  return value
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A')
    .replace(/:/g, '%3A')
    .replace(/,/g, '%2C');
}

function escapeData(value: string): string {
  return value.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

export interface AnnotationOptions {
  /** Test/story-file findings count toward the gate. Default `false`. */
  readonly includeTestFiles?: boolean;
}

/**
 * One GitHub Actions workflow command per finding. A test/story-file finding
 * that the `--fail-on` gate ignores is emitted as a `notice` (title tagged
 * "test file, not gated"), so an `::error` line always means a gated error.
 */
export function encodeAnnotation(
  diagnostic: Diagnostic,
  options: AnnotationOptions = {},
): string {
  const ungated =
    diagnostic.surface === 'test' && options.includeTestFiles !== true;
  const level = ungated
    ? 'notice'
    : diagnostic.severity === 'error'
      ? 'error'
      : 'warning';
  const title = ungated
    ? `${diagnostic.ruleId} (test file, not gated)`
    : diagnostic.ruleId;
  const props = [
    `file=${escapeProperty(diagnostic.file)}`,
    `line=${diagnostic.line}`,
    `col=${diagnostic.column}`,
    `title=${escapeProperty(title)}`,
  ].join(',');
  return `::${level} ${props}::${escapeData(diagnostic.message)}`;
}

export function encodeAnnotations(
  diagnostics: Diagnostic[],
  options: AnnotationOptions = {},
): string {
  return diagnostics.map((d) => encodeAnnotation(d, options)).join('\n');
}
