import { describe, expect, it } from 'vitest';
import { isAuditableProject, selectProjectKind } from './selection.js';

describe('selectProjectKind', () => {
  it('selects nuxt for a nuxt project', () => {
    expect(selectProjectKind({ framework: 'nuxt' })).toBe('nuxt');
  });

  it('selects vue for a vue project', () => {
    expect(selectProjectKind({ framework: 'vue' })).toBe('vue');
  });

  it('returns unknown for an unrecognized project', () => {
    expect(selectProjectKind({ framework: 'unknown' })).toBe('unknown');
  });
});

describe('isAuditableProject', () => {
  it('is true for vue and nuxt', () => {
    expect(isAuditableProject({ framework: 'vue' })).toBe(true);
    expect(isAuditableProject({ framework: 'nuxt' })).toBe(true);
  });

  it('is false for unknown', () => {
    expect(isAuditableProject({ framework: 'unknown' })).toBe(false);
  });
});
