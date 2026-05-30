import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkVueTsc } from '../../src/build-quality/check-vue-tsc.js';
import { fixture, makeProjectInfo } from './helpers.js';

describe('checkVueTsc', () => {
  it('flags a vue project whose devDependencies lack vue-tsc', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        devDependencies: { typescript: '^6.0.0' },
      }),
    });
    const issues = await checkVueTsc(
      makeProjectInfo(dir, { framework: 'vue' }),
    );
    expect(issues).toHaveLength(1);
    const issue = issues[0];
    expect(issue.ruleId).toBe('vue-doctor/build-quality/vue-tsc-in-devDeps');
    expect(issue.severity).toBe('warn');
    expect(issue.file).toBe(join(dir, 'package.json'));
    expect(issue.line).toBe(1);
    expect(issue.column).toBe(1);
    expect(issue.message).toContain(
      'github.com/vuejs/language-tools/tree/master/packages/tsc',
    );
    expect(issue.recommendation).toBeTruthy();
  });

  it('flags a nuxt project without vue-tsc', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({ name: 'x', devDependencies: {} }),
    });
    const issues = await checkVueTsc(
      makeProjectInfo(dir, { framework: 'nuxt' }),
    );
    expect(issues).toHaveLength(1);
  });

  it('flags when devDependencies is absent entirely', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({ name: 'x' }),
    });
    const issues = await checkVueTsc(
      makeProjectInfo(dir, { framework: 'vue' }),
    );
    expect(issues).toHaveLength(1);
  });

  it('does not flag when vue-tsc is present', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        devDependencies: { 'vue-tsc': '^2.0.0' },
      }),
    });
    const issues = await checkVueTsc(
      makeProjectInfo(dir, { framework: 'vue' }),
    );
    expect(issues).toEqual([]);
  });

  it('does not flag a non-vue/non-nuxt framework', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({ name: 'x', devDependencies: {} }),
    });
    const issues = await checkVueTsc(
      makeProjectInfo(dir, { framework: 'unknown' }),
    );
    expect(issues).toEqual([]);
  });

  it('returns [] when the package.json is missing on disk', async () => {
    const dir = await fixture({ 'other.txt': '' });
    const issues = await checkVueTsc(
      makeProjectInfo(dir, { framework: 'vue' }),
    );
    expect(issues).toEqual([]);
  });

  it('returns [] when packageJsonPath is null', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    const issues = await checkVueTsc(
      makeProjectInfo(dir, { framework: 'vue', packageJsonPath: null }),
    );
    expect(issues).toEqual([]);
  });
});
