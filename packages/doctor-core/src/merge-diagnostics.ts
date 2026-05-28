import type { Diagnostic } from './types.js';

export function mergeDiagnostics(...batches: Diagnostic[][]): Diagnostic[] {
  const seen = new Set<string>();
  const out: Diagnostic[] = [];
  for (const batch of batches) {
    for (const d of batch) {
      const key = `${d.file}|${d.line}|${d.column}|${d.ruleId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(d);
    }
  }
  out.sort((a, b) => {
    if (a.file !== b.file) return a.file < b.file ? -1 : 1;
    if (a.line !== b.line) return a.line - b.line;
    if (a.column !== b.column) return a.column - b.column;
    return a.ruleId < b.ruleId ? -1 : 1;
  });
  return out;
}
