import { describe, expect, it } from 'vitest';
import { mergeDiagnostics } from '../src/merge-diagnostics.js';
import type { Diagnostic } from '../src/types.js';

function d(ruleId: string): Diagnostic {
  return {
    file: '/a.vue',
    line: 1,
    column: 1,
    ruleId,
    severity: 'error',
    message: 'm',
    source: 'template',
  };
}

describe('mergeDiagnostics ruleId tiebreak', () => {
  it('orders by ruleId when file, line and column are identical', () => {
    const merged = mergeDiagnostics([d('zzz'), d('aaa')]);
    expect(merged.map((m) => m.ruleId)).toEqual(['aaa', 'zzz']);
  });

  it('keeps the inverse ruleId ordering stable', () => {
    const merged = mergeDiagnostics([d('aaa'), d('zzz')]);
    expect(merged.map((m) => m.ruleId)).toEqual(['aaa', 'zzz']);
  });

  it('dedupes identical file|line|column|ruleId keys (continue branch)', () => {
    const merged = mergeDiagnostics([d('same')], [d('same')]);
    expect(merged).toHaveLength(1);
  });

  it('orders by file in both directions', () => {
    function f(file: string): Diagnostic {
      return { ...d('r'), file };
    }
    const merged = mergeDiagnostics([f('/m.vue'), f('/z.vue'), f('/a.vue')]);
    expect(merged.map((x) => x.file)).toEqual(['/a.vue', '/m.vue', '/z.vue']);
  });

  it('orders by line then column when file matches', () => {
    function lc(line: number, column: number): Diagnostic {
      return { ...d('r'), line, column };
    }
    const merged = mergeDiagnostics([lc(2, 1), lc(1, 9), lc(1, 2)]);
    expect(merged.map((x) => `${x.line}:${x.column}`)).toEqual([
      '1:2',
      '1:9',
      '2:1',
    ]);
  });
});
