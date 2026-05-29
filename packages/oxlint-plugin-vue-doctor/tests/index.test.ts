import { describe, expect, it } from 'vitest';
import defaultExport, { plugin } from '../src/index.js';

describe('plugin index', () => {
  it('exposes the vue-doctor meta name', () => {
    expect(plugin.meta.name).toBe('vue-doctor');
  });

  it('registers all four rules', () => {
    expect(Object.keys(plugin.rules).sort()).toEqual(
      [
        'no-destructure-props-without-to-refs',
        'no-destructure-reactive-without-to-refs',
        'no-em-dash-in-string',
        'no-non-null-assertion-on-ref-value',
      ].sort(),
    );
  });

  it('each registered rule is a valid rule with a create function', () => {
    for (const value of Object.values(plugin.rules)) {
      expect(typeof value.create).toBe('function');
    }
  });

  it('default export is the same object as the named plugin export', () => {
    expect(defaultExport).toBe(plugin);
  });
});
