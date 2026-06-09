import { describe, expect, it } from 'vitest';
import { docsUrl } from '../src/reporters/docs-url.js';

describe('docsUrl', () => {
  it('builds a deterministic docs URL from a ruleId', () => {
    expect(docsUrl('reactivity/no-destructure-reactive')).toBe(
      'https://docs.the-doctor.report/rules/reactivity/no-destructure-reactive',
    );
  });

  it('is pure: same input yields the same output', () => {
    const id = 'vue-doctor/template/v-for-has-key';
    expect(docsUrl(id)).toBe(docsUrl(id));
    expect(docsUrl(id)).toBe(`https://docs.the-doctor.report/rules/${id}`);
  });
});
