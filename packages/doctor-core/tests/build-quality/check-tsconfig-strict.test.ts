import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkTsconfigStrict } from '../../src/build-quality/check-tsconfig-strict.js';
import { fixture, makeProjectInfo } from './helpers.js';

describe('checkTsconfigStrict', () => {
  it('flags a tsconfig with strict:false', async () => {
    const dir = await fixture({
      'package.json': '{"name":"x"}',
      'tsconfig.json': '{"compilerOptions":{"strict":false}}',
    });
    const issues = await checkTsconfigStrict(makeProjectInfo(dir));
    expect(issues).toHaveLength(1);
    const issue = issues[0];
    expect(issue.ruleId).toBe(
      'vue-doctor/build-quality/tsconfig-strict-required',
    );
    expect(issue.severity).toBe('warn');
    expect(issue.file).toBe(join(dir, 'tsconfig.json'));
    expect(issue.line).toBe(1);
    expect(issue.column).toBe(1);
    expect(issue.message).toContain('typescriptlang.org/tsconfig#strict');
    expect(issue.recommendation).toBeTruthy();
  });

  it('flags a tsconfig that omits strict entirely', async () => {
    const dir = await fixture({
      'package.json': '{"name":"x"}',
      'tsconfig.json': '{"compilerOptions":{"target":"esnext"}}',
    });
    const issues = await checkTsconfigStrict(makeProjectInfo(dir));
    expect(issues).toHaveLength(1);
  });

  it('flags a tsconfig with no compilerOptions block', async () => {
    const dir = await fixture({
      'package.json': '{"name":"x"}',
      'tsconfig.json': '{"files":[]}',
    });
    const issues = await checkTsconfigStrict(makeProjectInfo(dir));
    expect(issues).toHaveLength(1);
  });

  it('parses a tsconfig with comments after stripping them', async () => {
    const dir = await fixture({
      'package.json': '{"name":"x"}',
      'tsconfig.json':
        '{\n  // base config\n  "compilerOptions": { "strict": false /* off */ }\n}',
    });
    const issues = await checkTsconfigStrict(makeProjectInfo(dir));
    expect(issues).toHaveLength(1);
  });

  it('does not flag when strict is true', async () => {
    const dir = await fixture({
      'package.json': '{"name":"x"}',
      'tsconfig.json': '{"compilerOptions":{"strict":true}}',
    });
    const issues = await checkTsconfigStrict(makeProjectInfo(dir));
    expect(issues).toEqual([]);
  });

  it('returns [] when no tsconfig exists in the package.json directory', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    const issues = await checkTsconfigStrict(makeProjectInfo(dir));
    expect(issues).toEqual([]);
  });

  it('does not escape outward to a parent-directory tsconfig', async () => {
    const dir = await fixture({
      'tsconfig.json': '{"compilerOptions":{"strict":false}}',
      'app/package.json': '{"name":"x"}',
    });
    const projectInfo = makeProjectInfo(join(dir, 'app'), {
      packageJsonPath: join(dir, 'app', 'package.json'),
    });
    const issues = await checkTsconfigStrict(projectInfo);
    expect(issues).toEqual([]);
  });

  it('returns [] when the tsconfig is malformed JSON', async () => {
    const dir = await fixture({
      'package.json': '{"name":"x"}',
      'tsconfig.json': '{ this is not json',
    });
    const issues = await checkTsconfigStrict(makeProjectInfo(dir));
    expect(issues).toEqual([]);
  });

  it('returns [] when packageJsonPath is null', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    const issues = await checkTsconfigStrict(
      makeProjectInfo(dir, { packageJsonPath: null }),
    );
    expect(issues).toEqual([]);
  });
});
