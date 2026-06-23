import { describe, expect, it } from 'vitest';
import { scoreDiagnostics } from '../src/score.js';
import { SCORE_DIMENSIONS } from '../src/score-dimensions.js';
import type { Diagnostic } from '../src/types.js';

function diag(
  severity: 'error' | 'warn' | 'info',
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
    const result = scoreDiagnostics([]);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
    expect(result.threshold).toBe(0);
    expect(result.totalFindings).toBe(0);
    expect(result.errorCount).toBe(0);
    expect(result.warnCount).toBe(0);
    expect(result.infoCount).toBe(0);
    expect(result.breakdown).toEqual([]);
  });

  it('penalizes 5 for a single error (score 95)', () => {
    const result = scoreDiagnostics([diag('error')]);
    expect(result.score).toBe(95);
    expect(result.errorCount).toBe(1);
    expect(result.warnCount).toBe(0);
    expect(result.infoCount).toBe(0);
    expect(result.totalFindings).toBe(1);
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0]?.ruleId).toBe('r');
    expect(result.breakdown[0]?.occurrences).toBe(1);
    expect(result.breakdown[0]?.penalty).toBe(5);
  });

  it('applies √-decay for 3 same-rule errors → score 89', () => {
    const result = scoreDiagnostics([
      diag('error', { ruleId: 'r' }),
      diag('error', { ruleId: 'r' }),
      diag('error', { ruleId: 'r' }),
    ]);
    expect(result.score).toBe(89);
    expect(result.errorCount).toBe(3);
    expect(result.breakdown).toHaveLength(1);
    expect(result.breakdown[0]?.occurrences).toBe(3);
  });

  it('penalizes 2 for a single warn (score 98)', () => {
    const result = scoreDiagnostics([diag('warn')]);
    expect(result.score).toBe(98);
    expect(result.warnCount).toBe(1);
  });

  it('penalizes 0.5 for a single info → rounds to 100', () => {
    const result = scoreDiagnostics([diag('info')]);
    expect(result.score).toBe(100);
    expect(result.infoCount).toBe(1);
  });

  it('groups by ruleId and sums penalties deterministically', () => {
    const result = scoreDiagnostics([
      diag('error', { ruleId: 'a' }),
      diag('warn', { ruleId: 'b' }),
      diag('warn', { ruleId: 'b' }),
    ]);
    expect(result.errorCount).toBe(1);
    expect(result.warnCount).toBe(2);
    expect(result.totalFindings).toBe(3);
    expect(result.breakdown).toHaveLength(2);
    expect(result.score).toBe(
      Math.max(0, Math.round(100 - (5 + 2 + 2 / Math.sqrt(2)))),
    );
  });

  it('sorts breakdown by penalty descending', () => {
    const result = scoreDiagnostics([
      diag('warn', { ruleId: 'low' }),
      diag('error', { ruleId: 'high' }),
    ]);
    expect(result.breakdown[0]?.ruleId).toBe('high');
    expect(result.breakdown[1]?.ruleId).toBe('low');
  });

  it('clamps score to 0 when penalty exceeds 100', () => {
    const errors = Array.from({ length: 21 }, (_, i) =>
      diag('error', { ruleId: `rule-${i}` }),
    );
    expect(scoreDiagnostics(errors).score).toBe(0);
  });

  it('is deterministic regardless of input order (shuffle 100×)', () => {
    const diagnostics = [
      diag('error', { ruleId: 'a' }),
      diag('error', { ruleId: 'a' }),
      diag('warn', { ruleId: 'b' }),
      diag('info', { ruleId: 'c' }),
      diag('error', { ruleId: 'd' }),
    ];
    const expected = scoreDiagnostics(diagnostics);
    for (let i = 0; i < 100; i++) {
      const shuffled = [...diagnostics].sort(() => Math.random() - 0.5);
      const result = scoreDiagnostics(shuffled);
      expect(result.score).toBe(expected.score);
      expect(result.breakdown).toEqual(expected.breakdown);
    }
  });

  it('supports per-rule weight overrides', () => {
    const diagnostics = [diag('warn', { ruleId: 'custom' })];
    const result = scoreDiagnostics(diagnostics, {
      rules: { custom: { weight: 10 } },
    });
    expect(result.score).toBe(90);
    expect(result.breakdown[0]?.weightPerOccurrence).toBe(10);
    expect(result.breakdown[0]?.penalty).toBe(10);
  });

  it('falls back to severity weight when no override exists', () => {
    const diagnostics = [diag('error', { ruleId: 'no-override' })];
    const result = scoreDiagnostics(diagnostics, {
      rules: { 'other-rule': { weight: 99 } },
    });
    expect(result.score).toBe(95);
    expect(result.breakdown[0]?.weightPerOccurrence).toBe(5);
  });

  it('uses threshold for passed flag', () => {
    const result = scoreDiagnostics([diag('error')], {
      threshold: 96,
    });
    expect(result.score).toBe(95);
    expect(result.passed).toBe(false);
    expect(result.threshold).toBe(96);
  });

  it('passes when score meets threshold', () => {
    const result = scoreDiagnostics([diag('error')], {
      threshold: 95,
    });
    expect(result.score).toBe(95);
    expect(result.passed).toBe(true);
  });

  it('defaults threshold to 0 (always passes unless score < 0)', () => {
    const result = scoreDiagnostics([]);
    expect(result.threshold).toBe(0);
    expect(result.passed).toBe(true);
  });

  it('applies √-decay starting at second occurrence (i=0 full, i>0 decayed)', () => {
    const result = scoreDiagnostics([
      diag('error', { ruleId: 'r' }),
      diag('error', { ruleId: 'r' }),
    ]);
    const expectedPenalty = 5 + 5 / Math.sqrt(2);
    expect(result.score).toBe(Math.max(0, Math.round(100 - expectedPenalty)));
    expect(result.breakdown[0]?.occurrences).toBe(2);
  });

  describe('byDimension', () => {
    it('always populates all six dimensions at 100 for empty diagnostics', () => {
      const { byDimension } = scoreDiagnostics([]);
      for (const dim of SCORE_DIMENSIONS) {
        expect(byDimension[dim].score).toBe(100);
        expect(byDimension[dim].totalFindings).toBe(0);
      }
    });

    it('isolates a security finding to the security dimension', () => {
      const { byDimension } = scoreDiagnostics([
        diag('error', { ruleId: 'vue-doctor/security/no-eval-like' }),
      ]);
      expect(byDimension.security.score).toBe(95);
      expect(byDimension.security.errorCount).toBe(1);
      expect(byDimension.security.totalFindings).toBe(1);
      expect(byDimension.performance.score).toBe(100);
      expect(byDimension.correctness.score).toBe(100);
    });

    it('routes performance + template-perf rules into the performance dimension', () => {
      const { byDimension } = scoreDiagnostics([
        diag('warn', { ruleId: 'vue-doctor/template/no-random-key' }),
        diag('warn', {
          ruleId: 'vue-doctor/template/no-computed-getter-in-template-loop',
        }),
      ]);
      expect(byDimension.performance.totalFindings).toBe(2);
      expect(byDimension.performance.warnCount).toBe(2);
      expect(byDimension.security.score).toBe(100);
    });

    it('counts each severity within a dimension', () => {
      const { byDimension } = scoreDiagnostics([
        diag('error', { ruleId: 'vue-doctor/security/no-eval-like' }),
        diag('warn', { ruleId: 'vue-doctor/security/no-secrets-in-source' }),
      ]);
      expect(byDimension.security.errorCount).toBe(1);
      expect(byDimension.security.warnCount).toBe(1);
      expect(byDimension.security.infoCount).toBe(0);
    });

    it('applies the same √-decay isolated per dimension', () => {
      const { byDimension } = scoreDiagnostics([
        diag('error', { ruleId: 'vue-doctor/security/no-eval-like' }),
        diag('error', { ruleId: 'vue-doctor/security/no-eval-like' }),
      ]);
      const expected = Math.max(0, Math.round(100 - (5 + 5 / Math.sqrt(2))));
      expect(byDimension.security.score).toBe(expected);
    });

    it('ignores ruleIds not in the registry (no dimension bucket)', () => {
      const { byDimension } = scoreDiagnostics([
        diag('error', { ruleId: 'totally/unknown' }),
      ]);
      for (const dim of SCORE_DIMENSIONS) {
        expect(byDimension[dim].totalFindings).toBe(0);
      }
    });

    it('honors per-rule weight overrides inside a dimension', () => {
      const { byDimension } = scoreDiagnostics(
        [diag('warn', { ruleId: 'vue-doctor/security/no-secrets-in-source' })],
        {
          rules: { 'vue-doctor/security/no-secrets-in-source': { weight: 10 } },
        },
      );
      expect(byDimension.security.score).toBe(90);
    });
  });
});
