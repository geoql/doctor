import { describe, expect, it } from 'vitest';
import { mergeDiagnostics } from '../src/merge-diagnostics.js';
import type { Diagnostic } from '../src/types.js';

function d(
  file: string,
  line: number,
  column: number,
  ruleId: string,
  source: 'template' | 'oxlint' = 'template',
): Diagnostic {
  return {
    file,
    line,
    column,
    ruleId,
    severity: 'error',
    message: 'm',
    source,
  };
}

describe('mergeDiagnostics', () => {
  it('deduplicates identical (file, line, column, ruleId)', () => {
    const merged = mergeDiagnostics(
      [d('/a.vue', 1, 1, 'rule-x'), d('/a.vue', 1, 1, 'rule-x')],
      [d('/a.vue', 1, 1, 'rule-x', 'oxlint')],
    );
    expect(merged).toHaveLength(1);
  });

  it('sorts by file, line, column, ruleId', () => {
    const merged = mergeDiagnostics(
      [d('/b.vue', 1, 1, 'r'), d('/a.vue', 2, 1, 'r')],
      [d('/a.vue', 1, 5, 'r'), d('/a.vue', 1, 1, 'r')],
    );
    expect(merged.map((m) => `${m.file}:${m.line}:${m.column}`)).toEqual([
      '/a.vue:1:1',
      '/a.vue:1:5',
      '/a.vue:2:1',
      '/b.vue:1:1',
    ]);
  });
});
