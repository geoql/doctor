import { describe, expect, it } from 'vite-plus/test';
import {
  computeDiagnosticDelta,
  type DeltaDiagnostic,
} from '../../src/baseline/delta.js';

function d(
  line: number,
  overrides: Partial<DeltaDiagnostic> = {},
): DeltaDiagnostic {
  return {
    file: '/r/a.ts',
    line,
    ruleId: 'r/one',
    message: 'same message',
    fingerprint: `fp-${line}`,
    ...overrides,
  };
}

describe('computeDiagnosticDelta', () => {
  it('reports nothing new when counts per (file, rule) do not grow', () => {
    const delta = computeDiagnosticDelta({
      head: [d(10, { fingerprint: 'changed' })],
      base: [d(1), d(2)],
    });
    expect(delta.newDiagnostics).toEqual([]);
    expect(delta.matchedCount).toBe(1);
    expect(delta.fixedCount).toBe(1);
  });

  it('reports every finding of a group absent from the base', () => {
    const head = [d(1, { ruleId: 'r/two' }), d(2, { file: '/r/b.ts' })];
    const delta = computeDiagnosticDelta({ head, base: [d(1)] });
    expect(delta.newDiagnostics).toEqual(head);
    expect(delta.fixedCount).toBe(1);
    expect(delta.matchedCount).toBe(0);
  });

  it('picks the unmatched finding by exact fingerprint + message first', () => {
    const existing = d(40, { fingerprint: 'fp-a' });
    const added = d(41, { fingerprint: 'fp-b' });
    const delta = computeDiagnosticDelta({
      head: [added, existing],
      base: [d(5, { fingerprint: 'fp-a' })],
    });
    expect(delta.newDiagnostics).toEqual([added]);
    expect(delta.matchedCount).toBe(1);
  });

  it('falls back to fingerprint-only, then message, choosing the closest line', () => {
    const fpOnly = computeDiagnosticDelta({
      head: [
        d(3, { fingerprint: 'fp-a', message: 'new wording' }),
        d(30, { fingerprint: 'fp-z', message: 'other' }),
      ],
      base: [d(3, { fingerprint: 'fp-a', message: 'old wording' })],
    });
    expect(fpOnly.newDiagnostics.map((x) => x.line)).toEqual([30]);

    const byMessage = computeDiagnosticDelta({
      head: [
        d(4, { fingerprint: 'x1' }),
        d(9, { fingerprint: 'x2' }),
        d(100, { fingerprint: 'x3', message: 'different' }),
      ],
      base: [d(8, { fingerprint: 'y1' }), d(90, { fingerprint: undefined })],
    });
    // base@8 takes the closer same-message head (9); base@90 then takes 4.
    expect(byMessage.newDiagnostics.map((x) => x.line)).toEqual([100]);
  });

  it('ranks leftovers by message similarity, then line distance', () => {
    const delta = computeDiagnosticDelta({
      head: [
        d(1, { fingerprint: undefined, message: 'alpha beta gamma' }),
        d(50, { fingerprint: undefined, message: 'alpha beta delta' }),
        d(51, { fingerprint: undefined, message: '!!!' }),
      ],
      base: [d(60, { fingerprint: undefined, message: 'alpha beta' })],
    });
    expect(delta.newDiagnostics.map((x) => x.line).sort()).toEqual([1, 51]);
  });

  it('follows renames and git line maps when pairing', () => {
    const delta = computeDiagnosticDelta({
      head: [
        d(20, { file: '/r/new.ts', fingerprint: 'a', message: 'm' }),
        d(22, { file: '/r/new.ts', fingerprint: 'b', message: 'm' }),
      ],
      base: [d(2, { file: '/r/old.ts', fingerprint: 'c', message: 'm' })],
      renamedFiles: new Map([['/r/old.ts', '/r/new.ts']]),
      mapBaseLine: (_file, line) => line + 20,
    });
    expect(delta.newDiagnostics.map((x) => x.line)).toEqual([20]);
    expect(delta.fixedCount).toBe(0);
  });
});
