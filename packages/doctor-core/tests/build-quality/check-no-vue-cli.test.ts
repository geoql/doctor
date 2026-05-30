import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkNoVueCli } from '../../src/build-quality/check-no-vue-cli.js';
import { fixture, makeProjectInfo } from './helpers.js';

describe('checkNoVueCli', () => {
  it('flags @vue/cli-service in devDependencies', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        devDependencies: { '@vue/cli-service': '^5.0.0' },
      }),
    });
    const issues = await checkNoVueCli(makeProjectInfo(dir));
    expect(issues).toHaveLength(1);
    const issue = issues[0];
    expect(issue.ruleId).toBe('vue-doctor/build-quality/no-vue-cli');
    expect(issue.severity).toBe('warn');
    expect(issue.file).toBe(join(dir, 'package.json'));
    expect(issue.line).toBe(1);
    expect(issue.message).toContain('@vue/cli-service');
    expect(issue.message).toContain('cli.vuejs.org/migrations');
    expect(issue.recommendation).toBeTruthy();
  });

  it('flags @vue/cli-service in dependencies', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        dependencies: { '@vue/cli-service': '^5.0.0' },
      }),
    });
    const issues = await checkNoVueCli(makeProjectInfo(dir));
    expect(issues).toHaveLength(1);
  });

  it('flags each vue-cli-plugin-* key with distinct line numbers', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        devDependencies: {
          'vue-cli-plugin-foo': '^1.0.0',
          'vue-cli-plugin-bar': '^1.0.0',
        },
      }),
    });
    const issues = await checkNoVueCli(makeProjectInfo(dir));
    expect(issues).toHaveLength(2);
    const lines = issues.map((i) => i.line).sort();
    expect(lines).toEqual([1, 2]);
    const keys = issues.map((i) => i.message).join(' ');
    expect(keys).toContain('vue-cli-plugin-foo');
    expect(keys).toContain('vue-cli-plugin-bar');
  });

  it('emits one diagnostic per offending key across cli-service and plugins', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        devDependencies: {
          '@vue/cli-service': '^5.0.0',
          'vue-cli-plugin-foo': '^1.0.0',
        },
      }),
    });
    const issues = await checkNoVueCli(makeProjectInfo(dir));
    expect(issues).toHaveLength(2);
    const lines = issues.map((i) => i.line);
    expect(new Set(lines).size).toBe(2);
  });

  it('does not flag a clean modern package.json', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        devDependencies: { vite: '^6.0.0' },
      }),
    });
    const issues = await checkNoVueCli(makeProjectInfo(dir));
    expect(issues).toEqual([]);
  });

  it('returns [] when the package.json is missing on disk', async () => {
    const dir = await fixture({ 'other.txt': '' });
    const issues = await checkNoVueCli(makeProjectInfo(dir));
    expect(issues).toEqual([]);
  });

  it('returns [] when packageJsonPath is null', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    const issues = await checkNoVueCli(
      makeProjectInfo(dir, { packageJsonPath: null }),
    );
    expect(issues).toEqual([]);
  });
});
