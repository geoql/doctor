import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkOgImageViaSatori } from '../../../src/nuxt/post-checks/og-image-via-satori.js';
import { fixture, makeNuxtProject } from './helpers.js';

const RULE_ID = 'nuxt-doctor/cloudflare/og-image-via-satori';

describe('checkOgImageViaSatori', () => {
  it('returns [] when packageJsonPath is null', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    const issues = await checkOgImageViaSatori(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: null,
        hasWranglerConfig: true,
      }),
    );
    expect(issues).toEqual([]);
  });

  it('returns [] when there is no wrangler config', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({ name: 'x', dependencies: {} }),
    });
    const issues = await checkOgImageViaSatori(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
        hasWranglerConfig: false,
      }),
    );
    expect(issues).toEqual([]);
  });

  it('returns [] when the package.json is missing on disk', async () => {
    const dir = await fixture({ 'other.txt': '' });
    const issues = await checkOgImageViaSatori(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
        hasWranglerConfig: true,
      }),
    );
    expect(issues).toEqual([]);
  });

  it('returns [] when @nuxtjs/og-image is installed', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        dependencies: { '@nuxtjs/og-image': '^3.0.0' },
      }),
    });
    const issues = await checkOgImageViaSatori(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
        hasWranglerConfig: true,
      }),
    );
    expect(issues).toEqual([]);
  });

  it('returns [] when nuxt-og-image is installed in devDependencies', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        devDependencies: { 'nuxt-og-image': '^3.0.0' },
      }),
    });
    const issues = await checkOgImageViaSatori(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
        hasWranglerConfig: true,
      }),
    );
    expect(issues).toEqual([]);
  });

  it('infos when on Cloudflare with no OG image module installed', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({ name: 'x', dependencies: {} }),
    });
    const issues = await checkOgImageViaSatori(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
        hasWranglerConfig: true,
      }),
    );
    expect(issues).toHaveLength(1);
    const issue = issues[0]!;
    expect(issue.ruleId).toBe(RULE_ID);
    expect(issue.severity).toBe('info');
    expect(issue.file).toBe(join(dir, 'package.json'));
    expect(issue.message).toContain('OG image');
    expect(issue.recommendation).toContain('Satori');
  });
});
