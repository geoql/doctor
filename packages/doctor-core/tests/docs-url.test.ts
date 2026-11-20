import { describe, expect, it } from 'vite-plus/test';
import { docsUrl } from '../src/reporters/docs-url.js';

describe('docsUrl', () => {
  it('builds a deterministic docs URL from a ruleId', () => {
    expect(docsUrl('reactivity/no-destructure-reactive')).toBe(
      'https://docs.the-doctor.report/rules/reactivity/no-destructure-reactive',
    );
  });
});
