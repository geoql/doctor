import { describe, expect, it } from 'vitest';
import { NUXT_RULES, VUE_RULES } from '../src/rules/index.js';
import type { CoreRule, Severity } from '../src/types.js';

/**
 * Sanity test for the registry arrays exported by `src/rules/index.ts`. They
 * are consumed downstream by the oxlint plugin adapters (`plugin.ts` →
 * `Object.fromEntries(VUE_RULES.map((rule) => [rule.id, rule]))`) and by the
 * forthcoming ESLint adapter. This test exercises the helper that builds
 * each entry, which keeps the registration site covered.
 */
describe('rule registries', () => {
  it('every VUE_RULES entry is a valid CoreRule with a working create()', () => {
    expect(VUE_RULES.length).toBeGreaterThan(0);
    for (const rule of VUE_RULES) {
      expectCoreRuleShape(rule);
      const visitors = rule.create({
        report: () => {},
        capabilities: new Set(),
      });
      expect(typeof visitors).toBe('object');
    }
  });

  it('every NUXT_RULES entry is a valid CoreRule with a working create()', () => {
    expect(NUXT_RULES.length).toBeGreaterThan(0);
    for (const rule of NUXT_RULES) {
      expectCoreRuleShape(rule);
      const visitors = rule.create({
        report: () => {},
        capabilities: new Set(),
      });
      expect(typeof visitors).toBe('object');
    }
  });

  it('VUE_RULES ids are unique', () => {
    const ids = VUE_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('NUXT_RULES ids are unique', () => {
    const ids = NUXT_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every VUE_RULES severity is one of the canonical three', () => {
    for (const rule of VUE_RULES) {
      expect(['error', 'warn', 'info']).toContain(rule.severity);
    }
  });

  it('every NUXT_RULES severity is one of the canonical three', () => {
    for (const rule of NUXT_RULES) {
      expect(['error', 'warn', 'info']).toContain(rule.severity);
    }
  });

  it('fixable rules declare meta.fixable === "code"', () => {
    for (const rule of VUE_RULES) {
      if (rule.fix) {
        expect(rule.meta?.fixable).toBe('code');
      }
    }
    for (const rule of NUXT_RULES) {
      if (rule.fix) {
        expect(rule.meta?.fixable).toBe('code');
      }
    }
  });
});

function expectCoreRuleShape(rule: CoreRule): void {
  expect(typeof rule.id).toBe('string');
  expect(rule.id.length).toBeGreaterThan(0);
  expect(typeof rule.category).toBe('string');
  const severities: readonly Severity[] = ['error', 'warn', 'info'];
  expect(severities).toContain(rule.severity);
  expect(typeof rule.recommended).toBe('boolean');
  expect(typeof rule.create).toBe('function');
  if (rule.fix) expect(typeof rule.fix).toBe('function');
}
