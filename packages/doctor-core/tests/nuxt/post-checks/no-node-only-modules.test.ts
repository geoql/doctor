import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkNoNodeOnlyModules } from '../../../src/nuxt/post-checks/no-node-only-modules.js';
import { fixture, makeNuxtProject } from './helpers.js';

const RULE_ID = 'nuxt-doctor/cloudflare/no-node-only-modules';

describe('checkNoNodeOnlyModules', () => {
  it('returns [] when packageJsonPath is null', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    const issues = await checkNoNodeOnlyModules(
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
      'package.json': JSON.stringify({
        name: 'x',
        dependencies: { 'fs-extra': '^11.0.0' },
      }),
    });
    const issues = await checkNoNodeOnlyModules(
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
    const issues = await checkNoNodeOnlyModules(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
        hasWranglerConfig: true,
      }),
    );
    expect(issues).toEqual([]);
  });

  it('returns [] for a clean dependency set on Cloudflare', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        dependencies: { nuxt: '^4.4.0' },
      }),
    });
    const issues = await checkNoNodeOnlyModules(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
        hasWranglerConfig: true,
      }),
    );
    expect(issues).toEqual([]);
  });

  it('warns on a node-only module when deploying to Cloudflare', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        dependencies: { sharp: '^0.33.0' },
      }),
    });
    const issues = await checkNoNodeOnlyModules(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
        hasWranglerConfig: true,
      }),
    );
    expect(issues).toHaveLength(1);
    const issue = issues[0]!;
    expect(issue.ruleId).toBe(RULE_ID);
    expect(issue.severity).toBe('warn');
    expect(issue.file).toBe(join(dir, 'package.json'));
    expect(issue.line).toBe(1);
    expect(issue.message).toContain('sharp');
    expect(issue.recommendation).toBeTruthy();
  });

  it('emits one diagnostic per node-only module with distinct lines', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        dependencies: { sharp: '^0.33.0' },
        devDependencies: { 'fs-extra': '^11.0.0' },
      }),
    });
    const issues = await checkNoNodeOnlyModules(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
        hasWranglerConfig: true,
      }),
    );
    expect(issues).toHaveLength(2);
    expect(new Set(issues.map((i) => i.line)).size).toBe(2);
  });

  it('does not double-count a module present in both dep maps', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        dependencies: { 'fs-extra': '^11.0.0' },
        devDependencies: { 'fs-extra': '^11.0.0' },
      }),
    });
    const issues = await checkNoNodeOnlyModules(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
        hasWranglerConfig: true,
      }),
    );
    expect(issues).toHaveLength(1);
  });
});
