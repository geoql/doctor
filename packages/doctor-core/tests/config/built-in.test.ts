import { describe, expect, it } from 'vitest';
import { BUILT_IN_RECOMMENDED } from '../../src/config/built-in.js';

describe('BUILT_IN_RECOMMENDED', () => {
  it('matches the locked snapshot', () => {
    expect(BUILT_IN_RECOMMENDED).toMatchSnapshot();
  });

  it('has the correct include globs', () => {
    expect(BUILT_IN_RECOMMENDED.include).toEqual([
      '**/*.vue',
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
    ]);
  });

  it('has the correct exclude patterns', () => {
    expect(BUILT_IN_RECOMMENDED.exclude).toEqual([
      'node_modules',
      'dist',
      '.nuxt',
      '.output',
      'coverage',
    ]);
  });

  it('defaults failOn to error', () => {
    expect(BUILT_IN_RECOMMENDED.failOn).toBe('error');
  });

  it('defaults threshold to 0', () => {
    expect(BUILT_IN_RECOMMENDED.threshold).toBe(0);
  });

  it('has empty rules', () => {
    expect(BUILT_IN_RECOMMENDED.rules).toEqual({});
  });
});
