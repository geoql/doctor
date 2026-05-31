import { describe, expect, it } from 'vitest';
import { checkNitroCloudflarePreset } from '../../../src/nuxt/post-checks/nitro-cloudflare-preset.js';
import { makeNuxtProject } from './helpers.js';

const RULE_ID = 'nuxt-doctor/cloudflare/nitro-cloudflare-preset';

describe('checkNitroCloudflarePreset', () => {
  it('returns [] when packageJsonPath is null', () => {
    expect(
      checkNitroCloudflarePreset(
        makeNuxtProject({
          packageJsonPath: null,
          hasWranglerConfig: true,
          nitroPreset: 'node-server',
        }),
      ),
    ).toEqual([]);
  });

  it('returns [] when there is no wrangler config', () => {
    expect(
      checkNitroCloudflarePreset(
        makeNuxtProject({
          hasWranglerConfig: false,
          nitroPreset: 'node-server',
        }),
      ),
    ).toEqual([]);
  });

  it('returns [] when no preset is defined (rule 6 owns that case)', () => {
    expect(
      checkNitroCloudflarePreset(
        makeNuxtProject({ hasWranglerConfig: true, nitroPreset: null }),
      ),
    ).toEqual([]);
  });

  it.each(['cloudflare-pages', 'cloudflare-module', 'cloudflare'])(
    'returns [] for the valid cloudflare preset %s',
    (preset) => {
      expect(
        checkNitroCloudflarePreset(
          makeNuxtProject({ hasWranglerConfig: true, nitroPreset: preset }),
        ),
      ).toEqual([]);
    },
  );

  it('warns when wrangler is present but the preset is not a cloudflare preset', () => {
    const issues = checkNitroCloudflarePreset(
      makeNuxtProject({ hasWranglerConfig: true, nitroPreset: 'node-server' }),
    );
    expect(issues).toHaveLength(1);
    const issue = issues[0]!;
    expect(issue.ruleId).toBe(RULE_ID);
    expect(issue.severity).toBe('warn');
    expect(issue.file).toBe('/x/nuxt.config.ts');
    expect(issue.line).toBe(1);
    expect(issue.message).toContain('node-server');
    expect(issue.recommendation).toContain('cloudflare');
  });

  it('reports package.json when there is no nuxt config path', () => {
    const issues = checkNitroCloudflarePreset(
      makeNuxtProject({
        hasWranglerConfig: true,
        nitroPreset: 'vercel',
        nuxtConfigPath: null,
      }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]!.file).toBe('/x/package.json');
  });
});
