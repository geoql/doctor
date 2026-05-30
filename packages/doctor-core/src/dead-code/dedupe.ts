import type { Diagnostic } from '../types.js';

export function dedupeDeadCodeAgainstLint(
  deadCode: Diagnostic[],
  lint: Diagnostic[],
): Diagnostic[] {
  const lintFiles = new Set(lint.map((d) => d.file));
  return deadCode.filter(
    (d) => !(d.ruleId === 'dead-code/unused-file' && lintFiles.has(d.file)),
  );
}
