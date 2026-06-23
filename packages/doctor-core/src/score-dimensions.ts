import type { RuleCategory } from './rule-registry.js';

export type ScoreDimension =
  | 'performance'
  | 'correctness'
  | 'security'
  | 'maintainability'
  | 'nuxt'
  | 'design';

export const SCORE_DIMENSIONS: readonly ScoreDimension[] = [
  'performance',
  'correctness',
  'security',
  'maintainability',
  'nuxt',
  'design',
];

// Every RuleCategory maps to exactly one dimension (a partition), so each
// diagnostic lands in exactly one dimension bucket and the per-dimension
// penalties sum to the overall penalty before clamping/rounding.
const CATEGORY_TO_DIMENSION: Readonly<Record<RuleCategory, ScoreDimension>> = {
  performance: 'performance',
  'template-perf': 'performance',
  reactivity: 'correctness',
  composition: 'correctness',
  template: 'correctness',
  sfc: 'correctness',
  'vue-builtin': 'correctness',
  hydration: 'correctness',
  security: 'security',
  'ai-slop': 'maintainability',
  'dead-code': 'maintainability',
  'build-quality': 'maintainability',
  deps: 'maintainability',
  structure: 'maintainability',
  'modules-deps': 'maintainability',
  nitro: 'nuxt',
  seo: 'nuxt',
  cloudflare: 'nuxt',
  'server-routes': 'nuxt',
  'data-fetching': 'nuxt',
  design: 'design',
};

export function dimensionForCategory(category: RuleCategory): ScoreDimension {
  return CATEGORY_TO_DIMENSION[category];
}

export function isScoreDimension(value: string): value is ScoreDimension {
  return (SCORE_DIMENSIONS as readonly string[]).includes(value);
}

export function categoriesForDimension(
  dimension: ScoreDimension,
): RuleCategory[] {
  const out: RuleCategory[] = [];
  for (const [cat, dim] of Object.entries(CATEGORY_TO_DIMENSION)) {
    if (dim === dimension) out.push(cat as RuleCategory);
  }
  return out;
}
