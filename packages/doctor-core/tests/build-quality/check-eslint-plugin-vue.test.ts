import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkEslintPluginVue } from '../../src/build-quality/check-eslint-plugin-vue.js';
import { fixture, makeProjectInfo } from './helpers.js';

describe('checkEslintPluginVue', () => {
  it('flags a vue project whose devDependencies lack eslint-plugin-vue', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        devDependencies: { eslint: '^9.0.0' },
      }),
    });
    const issues = await checkEslintPluginVue(
      makeProjectInfo(dir, { framework: 'vue' }),
    );
    expect(issues).toHaveLength(1);
    const issue = issues[0];
    expect(issue.ruleId).toBe(
      'vue-doctor/build-quality/eslint-plugin-vue-installed',
    );
    expect(issue.severity).toBe('info');
    expect(issue.file).toBe(join(dir, 'package.json'));
    expect(issue.line).toBe(1);
    expect(issue.column).toBe(1);
    expect(issue.message).toContain('eslint.vuejs.org');
    expect(issue.recommendation).toBeTruthy();
  });

  it('flags a nuxt project without eslint-plugin-vue', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({ name: 'x', devDependencies: {} }),
    });
    const issues = await checkEslintPluginVue(
      makeProjectInfo(dir, { framework: 'nuxt' }),
    );
    expect(issues).toHaveLength(1);
  });

  it('flags when devDependencies is absent entirely', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({ name: 'x' }),
    });
    const issues = await checkEslintPluginVue(
      makeProjectInfo(dir, { framework: 'vue' }),
    );
    expect(issues).toHaveLength(1);
  });

  it('does not flag when eslint-plugin-vue is present', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        devDependencies: { 'eslint-plugin-vue': '^9.0.0' },
      }),
    });
    const issues = await checkEslintPluginVue(
      makeProjectInfo(dir, { framework: 'vue' }),
    );
    expect(issues).toEqual([]);
  });

  it('does not flag a non-vue/non-nuxt framework', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({ name: 'x', devDependencies: {} }),
    });
    const issues = await checkEslintPluginVue(
      makeProjectInfo(dir, { framework: 'unknown' }),
    );
    expect(issues).toEqual([]);
  });

  it('returns [] when the package.json is missing on disk', async () => {
    const dir = await fixture({ 'other.txt': '' });
    const issues = await checkEslintPluginVue(
      makeProjectInfo(dir, { framework: 'vue' }),
    );
    expect(issues).toEqual([]);
  });

  it('returns [] when packageJsonPath is null', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    const issues = await checkEslintPluginVue(
      makeProjectInfo(dir, { framework: 'vue', packageJsonPath: null }),
    );
    expect(issues).toEqual([]);
  });
});
