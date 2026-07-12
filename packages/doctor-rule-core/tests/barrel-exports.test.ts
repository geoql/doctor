import { describe, expect, it } from 'vitest';
import * as ruleCore from '../src/index.js';
import * as rules from '../src/rules/index.js';
import '../src/types.js';

describe('package barrels', () => {
  it('re-exports rule sets and helpers', () => {
    expect(typeof ruleCore.defineRule).toBe('function');
    expect(Array.isArray(rules.VUE_RULES)).toBe(true);
    expect(Array.isArray(rules.NUXT_RULES)).toBe(true);
  });
});
