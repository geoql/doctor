import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkRecommendedModulesInstalled } from '../../../src/nuxt/post-checks/recommended-modules-installed.js';
import { fixture, makeNuxtProject } from './helpers.js';

const RULE_ID = 'nuxt-doctor/modules-deps/recommended-modules-installed';

describe('checkRecommendedModulesInstalled', () => {
  it('returns [] when packageJsonPath is null', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    const issues = await checkRecommendedModulesInstalled(
      makeNuxtProject({ rootDirectory: dir, packageJsonPath: null }),
    );
    expect(issues).toEqual([]);
  });

  it('returns [] when the package.json is missing on disk', async () => {
    const dir = await fixture({ 'other.txt': '' });
    const issues = await checkRecommendedModulesInstalled(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
    );
    expect(issues).toEqual([]);
  });

  it('returns [] when all recommended modules are present', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        dependencies: {
          '@nuxt/image': '^1.0.0',
          '@nuxtjs/seo': '^2.0.0',
          '@nuxt/fonts': '^0.10.0',
        },
      }),
    });
    const issues = await checkRecommendedModulesInstalled(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
    );
    expect(issues).toEqual([]);
  });

  it('suggests all three groups when none are present', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({ name: 'x', dependencies: {} }),
    });
    const issues = await checkRecommendedModulesInstalled(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
    );
    expect(issues).toHaveLength(3);
    for (const issue of issues) {
      expect(issue.ruleId).toBe(RULE_ID);
      expect(issue.severity).toBe('info');
      expect(issue.file).toBe(join(dir, 'package.json'));
    }
    const names = issues.map((i) => i.message).join(' ');
    expect(names).toContain('@nuxt/image');
    expect(names).toContain('@nuxtjs/seo');
    expect(names).toContain('@nuxt/fonts');
    expect(new Set(issues.map((i) => i.line)).size).toBe(3);
  });

  it('treats @nuxtjs/sitemap as satisfying the SEO group', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        dependencies: {
          '@nuxt/image': '^1.0.0',
          '@nuxtjs/sitemap': '^7.0.0',
          '@nuxt/fonts': '^0.10.0',
        },
      }),
    });
    const issues = await checkRecommendedModulesInstalled(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
    );
    expect(issues).toEqual([]);
  });

  it('detects recommended modules listed in devDependencies', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        dependencies: { '@nuxt/image': '^1.0.0' },
        devDependencies: { '@nuxtjs/seo': '^2.0.0' },
      }),
    });
    const issues = await checkRecommendedModulesInstalled(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain('@nuxt/fonts');
  });
});
