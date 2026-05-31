import { describe, expect, it } from 'vitest';
import { checkUsesAppDirectory } from '../../../src/nuxt/post-checks/uses-app-directory.js';
import { makeNuxtProject } from './helpers.js';

describe('checkUsesAppDirectory', () => {
  it('returns [] when packageJsonPath is null', () => {
    expect(
      checkUsesAppDirectory(makeNuxtProject({ packageJsonPath: null })),
    ).toEqual([]);
  });

  it('returns [] when an app/ directory is present', () => {
    expect(checkUsesAppDirectory(makeNuxtProject({ hasAppDir: true }))).toEqual(
      [],
    );
  });

  it('warns once when no app/ directory exists', () => {
    const issues = checkUsesAppDirectory(makeNuxtProject({ hasAppDir: false }));
    expect(issues).toHaveLength(1);
    const issue = issues[0]!;
    expect(issue.ruleId).toBe('nuxt-doctor/structure/uses-app-directory');
    expect(issue.severity).toBe('warn');
    expect(issue.file).toBe('/x/package.json');
    expect(issue.line).toBe(1);
    expect(issue.column).toBe(1);
    expect(issue.message).toContain('app/');
    expect(issue.recommendation).toBeTruthy();
  });
});
