import { describe, expect, it } from 'vitest';
import { encodeAnnotation, encodeAnnotations } from '../src/annotations.js';
import type { Diagnostic } from '../src/types.js';

function diag(overrides: Partial<Diagnostic> = {}): Diagnostic {
  return {
    file: 'src/Foo.vue',
    line: 3,
    column: 5,
    ruleId: 'vue-doctor/template/v-for-has-key',
    severity: 'error',
    message: 'missing key',
    source: 'template',
    ...overrides,
  };
}

describe('encodeAnnotation', () => {
  it('emits a GitHub Actions error command for error severity', () => {
    expect(encodeAnnotation(diag())).toBe(
      '::error file=src/Foo.vue,line=3,col=5,title=vue-doctor/template/v-for-has-key::missing key',
    );
  });

  it('maps warn and info severities to the warning level', () => {
    expect(encodeAnnotation(diag({ severity: 'warn' }))).toContain(
      '::warning ',
    );
    expect(encodeAnnotation(diag({ severity: 'info' }))).toContain(
      '::warning ',
    );
  });

  it('percent-encodes %, CR, and LF in the message', () => {
    const out = encodeAnnotation(diag({ message: 'a%b\rc\nd' }));
    expect(out.endsWith('::a%25b%0Dc%0Ad')).toBe(true);
  });

  it('encodes :, comma, and newlines in property values', () => {
    const out = encodeAnnotation(diag({ file: 'a:b,c\nd.vue' }));
    expect(out).toContain('file=a%3Ab%2Cc%0Ad.vue');
  });
});

describe('encodeAnnotations', () => {
  it('joins one line per diagnostic', () => {
    const out = encodeAnnotations([diag(), diag({ severity: 'warn' })]);
    expect(out.split('\n')).toHaveLength(2);
  });

  it('returns an empty string for no diagnostics', () => {
    expect(encodeAnnotations([])).toBe('');
  });
});
