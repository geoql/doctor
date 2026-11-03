import { describe, expect, it } from 'vite-plus/test';
import { loadRuleDoc } from '../src/rule-docs.js';
import {
  deriveRuleTags,
  listRules,
  RULE_REGISTRY,
  RULE_TAGS,
  type RuleDefinition,
} from '../src/rule-registry.js';

const base: RuleDefinition = {
  id: 'vue-doctor/x',
  severity: 'warn',
  category: 'composition',
  source: 'doctor',
  recommended: true,
};

describe('deriveRuleTags', () => {
  it('tags the framework from the id prefix', () => {
    expect(deriveRuleTags(base)).toEqual(['vue']);
    expect(deriveRuleTags({ ...base, id: 'vue/no-x' })).toEqual(['vue']);
    expect(deriveRuleTags({ ...base, id: 'nuxt-doctor/x' })).toEqual(['nuxt']);
    expect(
      deriveRuleTags({ ...base, id: 'dead-code/x', category: 'dead-code' }),
    ).toEqual(['dead-code']);
  });

  it.each([
    ['design', 'design'],
    ['ai-slop', 'ai-slop'],
    ['security', 'security-scan'],
    ['performance', 'performance'],
    ['template-perf', 'performance'],
    ['hydration', 'hydration'],
  ] as const)('maps category %s to tag %s', (category, tag) => {
    expect(deriveRuleTags({ ...base, category })).toContain(tag);
  });

  it('tags test-noise and migration-hint rules by id', () => {
    expect(
      deriveRuleTags({
        ...base,
        id: 'vue-doctor/security/no-secrets-in-source',
        category: 'security',
      }),
    ).toEqual(['vue', 'security-scan', 'test-noise']);
    expect(
      deriveRuleTags({ ...base, id: 'vue/no-deprecated-events-api' }),
    ).toEqual(['vue', 'migration-hint']);
  });
});

describe('RULE_REGISTRY tags', () => {
  it('only uses known tags and every rule has at least one', () => {
    for (const rule of RULE_REGISTRY) {
      expect(rule.tags.length).toBeGreaterThan(0);
      for (const tag of rule.tags) expect(RULE_TAGS).toContain(tag);
    }
  });

  it('covers design, test-noise, security-scan and ai-slop', () => {
    for (const tag of [
      'design',
      'test-noise',
      'security-scan',
      'ai-slop',
    ] as const) {
      expect(listRules({ tag }).length).toBeGreaterThan(0);
    }
  });

  it('filters list-rules by tag', () => {
    const design = listRules({ tag: 'design' });
    expect(design.every((r) => r.category === 'design')).toBe(true);
    expect(design.map((r) => r.id)).toContain(
      'vue-doctor/design/no-gradient-text',
    );
  });

  it('exposes tags on rule docs', () => {
    expect(loadRuleDoc('vue-doctor/security/no-v-html')?.tags).toEqual([
      'vue',
      'security-scan',
    ]);
  });
});
