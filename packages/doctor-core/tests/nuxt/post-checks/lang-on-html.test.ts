import { describe, expect, it } from 'vitest';
import { checkLangOnHtml } from '../../../src/nuxt/post-checks/lang-on-html.js';
import type { NuxtConfigInfo } from '../../../src/project-info/parse-nuxt-config.js';
import { makeNuxtProject } from './helpers.js';

const RULE_ID = 'nuxt-doctor/seo/lang-on-html';

describe('checkLangOnHtml', () => {
  it('returns [] when packageJsonPath is null', () => {
    const config: NuxtConfigInfo = {};
    expect(
      checkLangOnHtml(makeNuxtProject({ packageJsonPath: null }), config),
    ).toEqual([]);
  });

  it('returns [] when htmlLang is set in the config', () => {
    const config: NuxtConfigInfo = { htmlLang: 'en' };
    expect(checkLangOnHtml(makeNuxtProject(), config)).toEqual([]);
  });

  it('warns against the nuxt config when htmlLang is missing', () => {
    const issues = checkLangOnHtml(makeNuxtProject(), {});
    expect(issues).toHaveLength(1);
    const issue = issues[0]!;
    expect(issue.ruleId).toBe(RULE_ID);
    expect(issue.severity).toBe('warn');
    expect(issue.file).toBe('/x/nuxt.config.ts');
    expect(issue.line).toBe(1);
    expect(issue.message).toContain('lang');
    expect(issue.recommendation).toContain('htmlAttrs');
  });

  it('warns when no nuxt config exists, reporting package.json', () => {
    const issues = checkLangOnHtml(
      makeNuxtProject({ nuxtConfigPath: null }),
      null,
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]!.file).toBe('/x/package.json');
  });
});
