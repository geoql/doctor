import { describe, expect, it } from 'vitest';
import { checkVueMajorCurrent } from '../../src/deps/check-vue-major-current.js';
import type { ProjectInfo } from '../../src/types/project-info.js';

function makeProject(overrides: Partial<ProjectInfo>): ProjectInfo {
  return {
    framework: 'vue',
    rootDirectory: '/x',
    packageJsonPath: '/x/package.json',
    vueVersion: '3.5.34',
    nuxtVersion: null,
    typescriptVersion: '6.0.3',
    hasAutoImports: false,
    hasComponentsAutoImport: false,
    hasPinia: false,
    hasVueRouter: false,
    nitroPreset: null,
    nuxtCompatibilityVersion: null,
    monorepoKind: null,
    capabilities: new Set(),
    ...overrides,
  };
}

describe('checkVueMajorCurrent', () => {
  it('returns empty when packageJsonPath is null', () => {
    expect(
      checkVueMajorCurrent(makeProject({ packageJsonPath: null })),
    ).toEqual([]);
  });

  it('returns empty when vueVersion is null', () => {
    expect(checkVueMajorCurrent(makeProject({ vueVersion: null }))).toEqual([]);
  });

  it('returns empty when vueVersion is unparseable', () => {
    expect(checkVueMajorCurrent(makeProject({ vueVersion: 'latest' }))).toEqual(
      [],
    );
  });

  it('returns empty for the bundled floor exactly (3.5.x)', () => {
    expect(checkVueMajorCurrent(makeProject({ vueVersion: '3.5.0' }))).toEqual(
      [],
    );
  });

  it('returns empty for above the floor (3.6.0)', () => {
    expect(checkVueMajorCurrent(makeProject({ vueVersion: '3.6.0' }))).toEqual(
      [],
    );
  });

  it('returns empty when major differs from 3 (e.g. Vue 4 future)', () => {
    expect(checkVueMajorCurrent(makeProject({ vueVersion: '4.0.0' }))).toEqual(
      [],
    );
  });

  it('returns one info diag when vueVersion is below the floor (3.4.x)', () => {
    const diags = checkVueMajorCurrent(makeProject({ vueVersion: '3.4.21' }));
    expect(diags.length).toBe(1);
    expect(diags[0]!.ruleId).toBe('vue-doctor/deps/vue-major-current');
    expect(diags[0]!.severity).toBe('info');
    expect(diags[0]!.file).toBe('/x/package.json');
    expect(diags[0]!.message).toContain('3.4.21');
    expect(diags[0]!.message).toContain('^3.5.0');
    expect(diags[0]!.recommendation).toContain('^3.5.0');
  });

  it('returns one info diag for 3.0.x', () => {
    const diags = checkVueMajorCurrent(makeProject({ vueVersion: '3.0.0' }));
    expect(diags.length).toBe(1);
    expect(diags[0]!.severity).toBe('info');
  });

  it('handles leading v prefix in vueVersion', () => {
    expect(
      checkVueMajorCurrent(makeProject({ vueVersion: 'v3.5.34' })),
    ).toEqual([]);
    expect(
      checkVueMajorCurrent(makeProject({ vueVersion: 'v3.4.0' })).length,
    ).toBe(1);
  });
});
