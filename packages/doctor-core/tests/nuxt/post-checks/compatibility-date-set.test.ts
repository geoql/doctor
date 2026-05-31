import { describe, expect, it } from 'vitest';
import { checkCompatibilityDateSet } from '../../../src/nuxt/post-checks/compatibility-date-set.js';
import type { NuxtConfigInfo } from '../../../src/project-info/parse-nuxt-config.js';
import { makeNuxtProject } from './helpers.js';

const RULE_ID = 'nuxt-doctor/nitro/compatibilityDate-set';

describe('checkCompatibilityDateSet', () => {
  it('returns [] when packageJsonPath is null', () => {
    const config: NuxtConfigInfo = {};
    expect(
      checkCompatibilityDateSet(
        makeNuxtProject({ packageJsonPath: null }),
        config,
      ),
    ).toEqual([]);
  });

  it('returns [] when compatibilityDate is present in the config', () => {
    const config: NuxtConfigInfo = { compatibilityDate: '2025-01-01' };
    expect(checkCompatibilityDateSet(makeNuxtProject(), config)).toEqual([]);
  });

  it('errors against the nuxt config when compatibilityDate is missing', () => {
    const issues = checkCompatibilityDateSet(makeNuxtProject(), {});
    expect(issues).toHaveLength(1);
    const issue = issues[0]!;
    expect(issue.ruleId).toBe(RULE_ID);
    expect(issue.severity).toBe('error');
    expect(issue.file).toBe('/x/nuxt.config.ts');
    expect(issue.line).toBe(1);
    expect(issue.message).toContain('compatibilityDate');
    expect(issue.recommendation).toContain('compatibilityDate');
  });

  it('errors when no nuxt config exists, reporting package.json', () => {
    const issues = checkCompatibilityDateSet(
      makeNuxtProject({ nuxtConfigPath: null }),
      null,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]!.file).toBe('/x/package.json');
    expect(issues[0]!.severity).toBe('error');
  });
});
