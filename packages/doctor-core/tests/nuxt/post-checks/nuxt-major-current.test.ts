import { describe, expect, it } from 'vitest';
import { checkNuxtMajorCurrent } from '../../../src/nuxt/post-checks/nuxt-major-current.js';
import { makeNuxtProject } from './helpers.js';

describe('checkNuxtMajorCurrent', () => {
  it('returns [] when packageJsonPath is null', () => {
    expect(
      checkNuxtMajorCurrent(makeNuxtProject({ packageJsonPath: null })),
    ).toEqual([]);
  });

  it('returns [] when nuxtVersion is null', () => {
    expect(
      checkNuxtMajorCurrent(makeNuxtProject({ nuxtVersion: null })),
    ).toEqual([]);
  });

  it('returns [] when nuxtVersion is unparseable', () => {
    expect(
      checkNuxtMajorCurrent(makeNuxtProject({ nuxtVersion: 'latest' })),
    ).toEqual([]);
  });

  it('returns [] for the bundled floor exactly (4.4.x)', () => {
    expect(
      checkNuxtMajorCurrent(makeNuxtProject({ nuxtVersion: '4.4.0' })),
    ).toEqual([]);
  });

  it('returns [] for above the floor (4.5.0)', () => {
    expect(
      checkNuxtMajorCurrent(makeNuxtProject({ nuxtVersion: '4.5.0' })),
    ).toEqual([]);
  });

  it('returns [] when major differs from 4 (e.g. Nuxt 3)', () => {
    expect(
      checkNuxtMajorCurrent(makeNuxtProject({ nuxtVersion: '3.14.0' })),
    ).toEqual([]);
  });

  it('returns one info diag when nuxtVersion is below the floor (4.3.x)', () => {
    const issues = checkNuxtMajorCurrent(
      makeNuxtProject({ nuxtVersion: '4.3.1' }),
    );
    expect(issues).toHaveLength(1);
    const issue = issues[0]!;
    expect(issue.ruleId).toBe('nuxt-doctor/structure/nuxt-major-current');
    expect(issue.severity).toBe('info');
    expect(issue.file).toBe('/x/package.json');
    expect(issue.message).toContain('4.3.1');
    expect(issue.message).toContain('4.4');
    expect(issue.recommendation).toContain('4.4');
  });

  it('returns one info diag for 4.0.x', () => {
    const issues = checkNuxtMajorCurrent(
      makeNuxtProject({ nuxtVersion: '4.0.0' }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]!.severity).toBe('info');
  });

  it('handles a leading v prefix in nuxtVersion', () => {
    expect(
      checkNuxtMajorCurrent(makeNuxtProject({ nuxtVersion: 'v4.4.0' })),
    ).toEqual([]);
    expect(
      checkNuxtMajorCurrent(makeNuxtProject({ nuxtVersion: 'v4.3.0' })).length,
    ).toBe(1);
  });
});
