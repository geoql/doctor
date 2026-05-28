import { describe, expect, it } from 'vitest';
import { scoreDiagnostics } from '../src/score.js';
import type { Diagnostic } from '../src/types.js';

function diag(
  severity: 'error' | 'warning',
  overrides: Partial<Diagnostic> = {},
): Diagnostic {
  return {
    file: '/x.vue',
    line: 1,
    column: 1,
    ruleId: 'r',
    severity,
    message: 'm',
    source: 'template',
    ...overrides,
  };
}

describe('scoreDiagnostics', () => {
  it('returns 100 for empty diagnostics', () => {
    expect(scoreDiagnostics([])).toEqual({
      score: 100,
      errorCount: 0,
      warningCount: 0,
    });
  });

  it('penalizes 10 per error and 2 per warning', () => {
    const result = scoreDiagnostics([
      diag('error'),
      diag('error'),
      diag('warning'),
    ]);
    expect(result).toEqual({ score: 78, errorCount: 2, warningCount: 1 });
  });

  it('clamps to 0 when penalty exceeds 100', () => {
    const errors = Array.from({ length: 20 }, () => diag('error'));
    expect(scoreDiagnostics(errors).score).toBe(0);
  });
});
