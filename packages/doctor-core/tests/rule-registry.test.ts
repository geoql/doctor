import { describe, expect, it } from 'vitest';
import { listRules, RULE_REGISTRY } from '../src/rule-registry.js';

describe('rule-registry', () => {
  it('exposes a non-empty registry of unique rule ids', () => {
    expect(RULE_REGISTRY.length).toBeGreaterThan(20);
    const ids = RULE_REGISTRY.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('listRules with no filter returns all rules sorted by id', () => {
    const rules = listRules();
    expect(rules.length).toBe(RULE_REGISTRY.length);
    const ids = rules.map((r) => r.id);
    const sorted = [...ids].sort((a, b) => a.localeCompare(b));
    expect(ids).toEqual(sorted);
  });

  it('listRules with preset=recommended filters to recommended rules only', () => {
    const rules = listRules({ preset: 'recommended' });
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.every((r) => r.recommended)).toBe(true);
    expect(rules.length).toBeLessThan(RULE_REGISTRY.length);
  });

  it('listRules with preset=all returns the full registry', () => {
    const all = listRules({ preset: 'all' });
    expect(all.length).toBe(RULE_REGISTRY.length);
  });

  it('listRules filters by category', () => {
    const rules = listRules({ category: 'ai-slop' });
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.every((r) => r.category === 'ai-slop')).toBe(true);
  });

  it('listRules filters by source', () => {
    const rules = listRules({ source: 'oxlint-builtin' });
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.every((r) => r.source === 'oxlint-builtin')).toBe(true);
  });

  it('listRules filters by severity', () => {
    const rules = listRules({ severity: 'error' });
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.every((r) => r.severity === 'error')).toBe(true);
  });

  it('listRules composes multiple filters', () => {
    const rules = listRules({
      preset: 'recommended',
      severity: 'error',
      source: 'doctor',
    });
    expect(
      rules.every(
        (r) => r.recommended && r.severity === 'error' && r.source === 'doctor',
      ),
    ).toBe(true);
  });

  it('every registered rule has a non-empty id, valid severity, valid category, valid source', () => {
    const validSev = new Set(['error', 'warn', 'info']);
    const validCat = new Set([
      'ai-slop',
      'reactivity',
      'composition',
      'performance',
      'template',
      'template-perf',
      'build-quality',
      'deps',
      'dead-code',
      'sfc',
      'vue-builtin',
    ]);
    const validSrc = new Set(['doctor', 'oxlint-builtin', 'eslint-plugin-vue']);
    for (const rule of RULE_REGISTRY) {
      expect(rule.id.length).toBeGreaterThan(0);
      expect(validSev.has(rule.severity)).toBe(true);
      expect(validCat.has(rule.category)).toBe(true);
      expect(validSrc.has(rule.source)).toBe(true);
    }
  });
});
