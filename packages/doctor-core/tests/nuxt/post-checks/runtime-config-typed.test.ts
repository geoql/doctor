import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkRuntimeConfigTyped } from '../../../src/nuxt/post-checks/runtime-config-typed.js';
import type { NuxtConfigInfo } from '../../../src/project-info/parse-nuxt-config.js';
import { fixture, makeNuxtProject } from './helpers.js';

const RULE_ID = 'nuxt-doctor/nitro/runtime-config-typed';

describe('checkRuntimeConfigTyped', () => {
  it('returns [] when packageJsonPath is null', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    const config: NuxtConfigInfo = { hasRuntimeConfig: true };
    const issues = await checkRuntimeConfigTyped(
      makeNuxtProject({ rootDirectory: dir, packageJsonPath: null }),
      config,
    );
    expect(issues).toEqual([]);
  });

  it('returns [] when the config has no runtimeConfig key', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    const issues = await checkRuntimeConfigTyped(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
      {},
    );
    expect(issues).toEqual([]);
  });

  it('returns [] when the nuxt config could not be parsed', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    const issues = await checkRuntimeConfigTyped(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
      null,
    );
    expect(issues).toEqual([]);
  });

  it('returns [] when a RuntimeConfig augmentation exists on disk', async () => {
    const dir = await fixture({
      'package.json': '{"name":"x"}',
      'env.d.ts':
        "declare module 'nuxt/schema' { interface RuntimeConfig { apiSecret: string } }",
    });
    const config: NuxtConfigInfo = { hasRuntimeConfig: true };
    const issues = await checkRuntimeConfigTyped(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
      config,
    );
    expect(issues).toEqual([]);
  });

  it('infos when runtimeConfig is present but no augmentation type exists', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    const config: NuxtConfigInfo = { hasRuntimeConfig: true };
    const issues = await checkRuntimeConfigTyped(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
      config,
    );
    expect(issues).toHaveLength(1);
    const issue = issues[0]!;
    expect(issue.ruleId).toBe(RULE_ID);
    expect(issue.severity).toBe('info');
    expect(issue.file).toBe(join(dir, 'package.json'));
    expect(issue.message).toContain('runtimeConfig');
    expect(issue.recommendation).toBeTruthy();
  });

  it('ignores a .d.ts that does not mention RuntimeConfig', async () => {
    const dir = await fixture({
      'package.json': '{"name":"x"}',
      'shims.d.ts': "declare module '*.vue';",
    });
    const config: NuxtConfigInfo = { hasRuntimeConfig: true };
    const issues = await checkRuntimeConfigTyped(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
      config,
    );
    expect(issues).toHaveLength(1);
  });
});
