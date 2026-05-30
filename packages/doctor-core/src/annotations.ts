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

export function encodeAnnotation(diagnostic: Diagnostic): string {
  const level = diagnostic.severity === 'error' ? 'error' : 'warning';
  const props = [
    `file=${escapeProperty(diagnostic.file)}`,
    `line=${diagnostic.line}`,
    `col=${diagnostic.column}`,
    `title=${escapeProperty(diagnostic.ruleId)}`,
  ].join(',');
  return `::${level} ${props}::${escapeData(diagnostic.message)}`;
}

export function encodeAnnotations(diagnostics: Diagnostic[]): string {
  return diagnostics.map(encodeAnnotation).join('\n');
}
