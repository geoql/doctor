import { describe, expect, it } from 'vitest';
import {
  normalizeOxlintRuleId,
  toCanonicalDiagnostic,
  toCanonicalDiagnostics,
} from '../src/oxlint/diagnostic.js';
import type { OxlintRawDiagnostic } from '../src/oxlint/types.js';

describe('normalizeOxlintRuleId extra branches', () => {
  it('returns the rule field when code is absent', () => {
    expect(
      normalizeOxlintRuleId({ rule: 'vue/some-rule' } as OxlintRawDiagnostic),
    ).toBe('vue/some-rule');
  });

  it('returns oxlint/unknown when neither code nor rule is present', () => {
    expect(normalizeOxlintRuleId({} as OxlintRawDiagnostic)).toBe(
      'oxlint/unknown',
    );
  });
});

describe('toCanonicalDiagnostic location fallbacks', () => {
  it('falls back to start_line/start_column when labels absent', () => {
    const raw: OxlintRawDiagnostic = {
      filename: 'src/y.vue',
      message: 'm',
      severity: 'warning',
      code: 'vue(rule-y)',
      start_line: 12,
      start_column: 4,
      end_line: 13,
      end_column: 9,
    };
    const d = toCanonicalDiagnostic(raw, '/proj');
    expect(d.line).toBe(12);
    expect(d.column).toBe(4);
    expect(d.endLine).toBe(13);
    expect(d.endColumn).toBe(9);
    expect(d.severity).toBe('warning');
  });

  it('defaults to 1/1 when no span or start positions exist', () => {
    const raw: OxlintRawDiagnostic = {
      filename: 'src/z.vue',
      message: 'm',
      severity: 'error',
    };
    const d = toCanonicalDiagnostic(raw, '/proj');
    expect(d.line).toBe(1);
    expect(d.column).toBe(1);
    expect(d.severity).toBe('error');
    expect(d.endLine).toBeUndefined();
    expect(d.endColumn).toBeUndefined();
  });
});

describe('toCanonicalDiagnostics', () => {
  it('maps an array of raw diagnostics', () => {
    const out = toCanonicalDiagnostics(
      [
        { filename: 'a.vue', message: 'm1', severity: 'error' },
        { filename: 'b.vue', message: 'm2', severity: 'warning' },
      ],
      '/proj',
    );
    expect(out).toHaveLength(2);
    expect(out[0]?.file).toBe('/proj/a.vue');
    expect(out[1]?.severity).toBe('warning');
  });
});
