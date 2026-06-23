import { RULE_REGISTRY, type RuleCategory } from '../rule-registry.js';
import {
  categoriesForDimension,
  isScoreDimension,
} from '../score-dimensions.js';

export interface CategoryScopeInput {
  categories?: readonly string[];
  dimensions?: readonly string[];
}

const VALID_CATEGORIES: ReadonlySet<string> = new Set(
  RULE_REGISTRY.map((r) => r.category),
);

/**
 * Resolve `--category` + `--dimension` inputs to the concrete set of
 * RuleCategory values they cover. Returns undefined when no scope was
 * requested (run everything). Throws on an unknown category/dimension so the
 * CLI can exit 2 rather than silently ignore a typo.
 */
export function resolveCategoryScope(
  input: CategoryScopeInput,
): ReadonlySet<RuleCategory> | undefined {
  const cats = input.categories ?? [];
  const dims = input.dimensions ?? [];
  if (cats.length === 0 && dims.length === 0) return undefined;

  const out = new Set<RuleCategory>();
  for (const cat of cats) {
    if (!VALID_CATEGORIES.has(cat)) {
      throw new Error(`unknown --category '${cat}'`);
    }
    out.add(cat as RuleCategory);
  }
  for (const dim of dims) {
    if (!isScoreDimension(dim)) {
      throw new Error(`unknown --dimension '${dim}'`);
    }
    for (const cat of categoriesForDimension(dim)) out.add(cat);
  }
  return out;
}

/**
 * Narrow `ruleIds` to those whose registered category is in `scope`. RuleIds
 * not in the registry are dropped (a category scope is an explicit allowlist).
 */
export function filterRuleIdsByCategory(
  ruleIds: Iterable<string>,
  scope: ReadonlySet<RuleCategory>,
): Set<string> {
  const categoryById = new Map<string, RuleCategory>();
  for (const rule of RULE_REGISTRY) categoryById.set(rule.id, rule.category);
  const out = new Set<string>();
  for (const id of ruleIds) {
    const cat = categoryById.get(id);
    if (cat !== undefined && scope.has(cat)) out.add(id);
  }
  return out;
}
