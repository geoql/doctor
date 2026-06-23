import { describe, expect, it } from 'vitest';
import {
  filterRuleIdsByCategory,
  resolveCategoryScope,
} from '../src/config/category-filter.js';

describe('resolveCategoryScope', () => {
  it('returns undefined when no category or dimension is requested', () => {
    expect(resolveCategoryScope({})).toBeUndefined();
    expect(
      resolveCategoryScope({ categories: [], dimensions: [] }),
    ).toBeUndefined();
  });

  it('resolves a single category', () => {
    const scope = resolveCategoryScope({ categories: ['security'] });
    expect(scope?.has('security')).toBe(true);
    expect(scope?.has('performance')).toBe(false);
  });

  it('resolves a dimension to all its categories', () => {
    const scope = resolveCategoryScope({ dimensions: ['performance'] });
    expect(scope?.has('performance')).toBe(true);
    expect(scope?.has('template-perf')).toBe(true);
  });

  it('unions categories and dimensions', () => {
    const scope = resolveCategoryScope({
      categories: ['security'],
      dimensions: ['performance'],
    });
    expect(scope?.has('security')).toBe(true);
    expect(scope?.has('performance')).toBe(true);
    expect(scope?.has('template-perf')).toBe(true);
  });

  it('throws on an unknown category', () => {
    expect(() => resolveCategoryScope({ categories: ['nope'] })).toThrow(
      /unknown --category 'nope'/,
    );
  });

  it('throws on an unknown dimension', () => {
    expect(() => resolveCategoryScope({ dimensions: ['nope'] })).toThrow(
      /unknown --dimension 'nope'/,
    );
  });
});

describe('filterRuleIdsByCategory', () => {
  it('keeps only rule ids whose category is in scope', () => {
    const scope = resolveCategoryScope({ dimensions: ['performance'] })!;
    const out = filterRuleIdsByCategory(
      [
        'vue-doctor/template/no-random-key',
        'vue-doctor/security/no-eval-like',
        'vue-doctor/template/v-memo-on-large-list',
      ],
      scope,
    );
    expect(out.has('vue-doctor/template/no-random-key')).toBe(true);
    expect(out.has('vue-doctor/template/v-memo-on-large-list')).toBe(true);
    expect(out.has('vue-doctor/security/no-eval-like')).toBe(false);
  });

  it('drops rule ids not present in the registry', () => {
    const scope = resolveCategoryScope({ categories: ['security'] })!;
    const out = filterRuleIdsByCategory(['totally/unknown-rule'], scope);
    expect(out.size).toBe(0);
  });
});
