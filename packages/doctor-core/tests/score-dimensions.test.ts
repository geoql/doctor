import { describe, expect, it } from 'vitest';
import { RULE_REGISTRY } from '../src/rule-registry.js';
import {
  SCORE_DIMENSIONS,
  categoriesForDimension,
  dimensionForCategory,
  isScoreDimension,
} from '../src/score-dimensions.js';

describe('score-dimensions', () => {
  it('maps every RuleCategory in the registry to a known dimension', () => {
    for (const rule of RULE_REGISTRY) {
      const dim = dimensionForCategory(rule.category);
      expect(SCORE_DIMENSIONS).toContain(dim);
    }
  });

  it('partitions performance + template-perf into the performance dimension', () => {
    expect(dimensionForCategory('performance')).toBe('performance');
    expect(dimensionForCategory('template-perf')).toBe('performance');
  });

  it('maps security to its own dimension', () => {
    expect(dimensionForCategory('security')).toBe('security');
  });

  it('maps nuxt-infra categories to the nuxt dimension', () => {
    expect(dimensionForCategory('nitro')).toBe('nuxt');
    expect(dimensionForCategory('data-fetching')).toBe('nuxt');
  });

  it('isScoreDimension recognizes valid and rejects invalid', () => {
    expect(isScoreDimension('performance')).toBe(true);
    expect(isScoreDimension('correctness')).toBe(true);
    expect(isScoreDimension('not-a-dim')).toBe(false);
  });

  it('categoriesForDimension(performance) returns both perf categories', () => {
    const cats = categoriesForDimension('performance');
    expect(cats).toContain('performance');
    expect(cats).toContain('template-perf');
    expect(cats).not.toContain('security');
  });

  it('every dimension has at least one category', () => {
    for (const dim of SCORE_DIMENSIONS) {
      expect(categoriesForDimension(dim).length).toBeGreaterThan(0);
    }
  });
});
