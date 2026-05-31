import { RULE_REGISTRY } from '../rule-registry.js';
import type { Severity } from '../types.js';

export type PresetName = 'minimal' | 'recommended' | 'strict' | 'all';

export const PRESET_NAMES: readonly PresetName[] = [
  'minimal',
  'recommended',
  'strict',
  'all',
];

export function isPresetName(value: string): value is PresetName {
  return (PRESET_NAMES as readonly string[]).includes(value);
}

/**
 * Resolve a preset name to its base ruleId -> Severity map.
 *
 * - `minimal`     : errors only (warn/info turned off)
 * - `recommended` : errors + warns (info off) — same as today's default
 * - `strict`      : errors + warns + infos all on at registered severity
 * - `all`         : alias of `strict` for now; reserved to surface every
 *                   known ruleId regardless of preset opt-in policy
 *
 * The returned map is the BASE; downstream code merges user config
 * `rules:` on top, then CLI `--rule` overrides on top of that.
 */
export function resolvePreset(name: PresetName): Record<string, Severity> {
  const rules: Record<string, Severity> = {};
  for (const rule of RULE_REGISTRY) {
    if (name === 'minimal') {
      if (rule.severity === 'error') rules[rule.id] = 'error';
    } else if (name === 'recommended') {
      if (rule.severity === 'error' || rule.severity === 'warn') {
        rules[rule.id] = rule.severity;
      }
    } else {
      // strict | all
      rules[rule.id] = rule.severity;
    }
  }
  return rules;
}
