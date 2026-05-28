import { describe, expect, it } from 'vitest';
import {
  normalizeOxlintRuleId,
  toCanonicalDiagnostic,
} from '../src/oxlint/diagnostic.js';
import type { OxlintRawDiagnostic } from '../src/oxlint/types.js';

describe('normalizeOxlintRuleId', () => {
  it('converts plugin(rule) form to plugin/rule', () => {
    expect(
      normalizeOxlintRuleId({
        code: 'vue(no-export-in-script-setup)',
      } as OxlintRawDiagnostic),
    ).toBe('vue/no-export-in-script-setup');
  });

  it('falls back to raw code if pattern does not match', () => {
    expect(
      normalizeOxlintRuleId({ code: 'weird' } as OxlintRawDiagnostic),
    ).toBe('weird');
  });

  it('falls back to rule field, then to oxlint/unknown', () => {
    expect(normalizeOxlintRuleId({ rule: 'r' } as OxlintRawDiagnostic)).toBe(
      'r',
    );
    expect(normalizeOxlintRuleId({} as OxlintRawDiagnostic)).toBe(
      'oxlint/unknown',
    );
  });
});

describe('toCanonicalDiagnostic', () => {
  it('extracts line/column from labels[0].span', () => {
    const raw: OxlintRawDiagnostic = {
      filename: 'src/x.vue',
      message: 'm',
      severity: 'error',
      code: 'vue(rule-y)',
      labels: [{ span: { offset: 10, length: 5, line: 7, column: 3 } }],
    };
    const canonical = toCanonicalDiagnostic(raw, '/proj');
    expect(canonical.line).toBe(7);
    expect(canonical.column).toBe(3);
    expect(canonical.ruleId).toBe('vue/rule-y');
    expect(canonical.file).toBe('/proj/src/x.vue');
    expect(canonical.source).toBe('oxlint');
  });
});
