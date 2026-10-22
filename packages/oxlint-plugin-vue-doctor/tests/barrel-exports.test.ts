import { describe, expect, it } from 'vite-plus/test';
import * as barrel from '../src/index.js';
import { defineRule } from '../src/define-rule.js';
import '../src/rule-types.js';

describe('package barrel', () => {
  it('exposes the oxlint plugin and defineRule re-export', () => {
    expect(barrel.default).toBeDefined();
    expect(typeof defineRule).toBe('function');
  });
});
