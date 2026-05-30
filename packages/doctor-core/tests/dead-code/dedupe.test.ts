import { describe, expect, it } from 'vitest';
import { dedupeDeadCodeAgainstLint } from '../../src/dead-code/dedupe.js';
import type { Diagnostic } from '../../src/types.js';

const makeDiag = (
  overrides: Partial<Diagnostic> & { file: string; ruleId: string },
): Diagnostic => ({
  line: 1,
  column: 1,
  severity: 'warn',
  message: 'test',
  source: 'dead-code',
  ...overrides,
});

describe('dedupeDeadCodeAgainstLint', () => {
  it('drops unused-file diagnostic when lint references the same file', () => {
    const deadCode: Diagnostic[] = [
      makeDiag({ file: '/src/old.ts', ruleId: 'dead-code/unused-file' }),
      makeDiag({
        file: '/src/used.ts',
        ruleId: 'dead-code/unused-export',
        message: 'Unused export: foo',
      }),
    ];
    const lint: Diagnostic[] = [
      makeDiag({
        file: '/src/old.ts',
        ruleId: 'some-lint-rule',
        source: 'oxlint',
      }),
    ];
    const result = dedupeDeadCodeAgainstLint(deadCode, lint);
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('dead-code/unused-export');
  });

  it('keeps unused-file diagnostic when no lint references that file', () => {
    const deadCode: Diagnostic[] = [
      makeDiag({ file: '/src/orphan.ts', ruleId: 'dead-code/unused-file' }),
    ];
    const lint: Diagnostic[] = [
      makeDiag({
        file: '/src/other.ts',
        ruleId: 'some-rule',
        source: 'oxlint',
      }),
    ];
    const result = dedupeDeadCodeAgainstLint(deadCode, lint);
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('dead-code/unused-file');
  });

  it('never drops non-unused-file dead-code diagnostics', () => {
    const deadCode: Diagnostic[] = [
      makeDiag({
        file: '/src/a.ts',
        ruleId: 'dead-code/unused-export',
        message: 'Unused export: fn',
      }),
      makeDiag({
        file: '/src/a.ts',
        ruleId: 'dead-code/unused-dependency',
        message: 'Unused dep',
      }),
    ];
    const lint: Diagnostic[] = [
      makeDiag({ file: '/src/a.ts', ruleId: 'some-rule', source: 'oxlint' }),
    ];
    const result = dedupeDeadCodeAgainstLint(deadCode, lint);
    expect(result).toHaveLength(2);
  });

  it('returns all dead-code diagnostics when lint is empty', () => {
    const deadCode: Diagnostic[] = [
      makeDiag({ file: '/src/a.ts', ruleId: 'dead-code/unused-file' }),
      makeDiag({
        file: '/src/b.ts',
        ruleId: 'dead-code/unused-export',
        message: 'Unused export: x',
      }),
    ];
    const result = dedupeDeadCodeAgainstLint(deadCode, []);
    expect(result).toHaveLength(2);
  });

  it('returns empty when both inputs are empty', () => {
    expect(dedupeDeadCodeAgainstLint([], [])).toEqual([]);
  });
});
