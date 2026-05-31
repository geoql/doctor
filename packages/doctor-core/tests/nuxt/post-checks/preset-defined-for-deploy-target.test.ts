import { describe, expect, it } from 'vitest';
import { checkPresetDefinedForDeployTarget } from '../../../src/nuxt/post-checks/preset-defined-for-deploy-target.js';
import { makeNuxtProject } from './helpers.js';

const RULE_ID = 'nuxt-doctor/nitro/preset-defined-for-deploy-target';

describe('checkPresetDefinedForDeployTarget', () => {
  it('returns [] when packageJsonPath is null', () => {
    expect(
      checkPresetDefinedForDeployTarget(
        makeNuxtProject({
          packageJsonPath: null,
          hasWranglerConfig: true,
          nitroPreset: null,
        }),
      ),
    ).toEqual([]);
  });

  it('returns [] when there is no wrangler config', () => {
    expect(
      checkPresetDefinedForDeployTarget(
        makeNuxtProject({ hasWranglerConfig: false, nitroPreset: null }),
      ),
    ).toEqual([]);
  });

  it('returns [] when a preset is already defined', () => {
    expect(
      checkPresetDefinedForDeployTarget(
        makeNuxtProject({
          hasWranglerConfig: true,
          nitroPreset: 'node-server',
        }),
      ),
    ).toEqual([]);
  });

  it('warns when wrangler config exists but no nitro preset is defined', () => {
    const issues = checkPresetDefinedForDeployTarget(
      makeNuxtProject({ hasWranglerConfig: true, nitroPreset: null }),
    );
    expect(issues).toHaveLength(1);
    const issue = issues[0]!;
    expect(issue.ruleId).toBe(RULE_ID);
    expect(issue.severity).toBe('warn');
    expect(issue.file).toBe('/x/nuxt.config.ts');
    expect(issue.line).toBe(1);
    expect(issue.message).toContain('preset');
    expect(issue.recommendation).toBeTruthy();
  });

  it('reports package.json when there is no nuxt config path', () => {
    const issues = checkPresetDefinedForDeployTarget(
      makeNuxtProject({
        hasWranglerConfig: true,
        nitroPreset: null,
        nuxtConfigPath: null,
      }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]!.file).toBe('/x/package.json');
  });
});
