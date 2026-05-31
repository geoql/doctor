import { describe, expect, it } from 'vitest';
import {
  isPresetName,
  PRESET_NAMES,
  resolvePreset,
} from '../../src/config/presets.js';
import { RULE_REGISTRY } from '../../src/rule-registry.js';

describe('presets', () => {
  it('PRESET_NAMES lists 4 presets in stable order', () => {
    expect(PRESET_NAMES).toEqual(['minimal', 'recommended', 'strict', 'all']);
  });

  it('isPresetName accepts known names', () => {
    for (const n of PRESET_NAMES) expect(isPresetName(n)).toBe(true);
  });

  it('isPresetName rejects unknown names', () => {
    expect(isPresetName('xxx')).toBe(false);
    expect(isPresetName('')).toBe(false);
  });

  it('minimal preset contains only error-severity rules', () => {
    const rules = resolvePreset('minimal');
    const errorCount = RULE_REGISTRY.filter(
      (r) => r.severity === 'error',
    ).length;
    expect(Object.keys(rules).length).toBe(errorCount);
    for (const sev of Object.values(rules)) expect(sev).toBe('error');
  });

  it('recommended preset contains error + warn rules, no info', () => {
    const rules = resolvePreset('recommended');
    const expected = RULE_REGISTRY.filter(
      (r) => r.severity === 'error' || r.severity === 'warn',
    ).length;
    expect(Object.keys(rules).length).toBe(expected);
    expect(
      Object.values(rules).every((s) => s === 'error' || s === 'warn'),
    ).toBe(true);
  });

  it('strict preset contains every registered rule at its registered severity', () => {
    const rules = resolvePreset('strict');
    expect(Object.keys(rules).length).toBe(RULE_REGISTRY.length);
    for (const r of RULE_REGISTRY) expect(rules[r.id]).toBe(r.severity);
  });

  it('all preset is identical to strict (alias today)', () => {
    expect(resolvePreset('all')).toEqual(resolvePreset('strict'));
  });

  it('strict ⊇ recommended ⊇ minimal (rule-set containment)', () => {
    const minimal = new Set(Object.keys(resolvePreset('minimal')));
    const recommended = new Set(Object.keys(resolvePreset('recommended')));
    const strict = new Set(Object.keys(resolvePreset('strict')));
    for (const id of minimal) expect(recommended.has(id)).toBe(true);
    for (const id of recommended) expect(strict.has(id)).toBe(true);
    expect(strict.size).toBeGreaterThan(recommended.size);
    expect(recommended.size).toBeGreaterThan(minimal.size);
  });
});
