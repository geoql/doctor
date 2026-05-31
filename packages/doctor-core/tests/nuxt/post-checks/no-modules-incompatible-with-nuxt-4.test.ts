import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkNoModulesIncompatibleWithNuxt4 } from '../../../src/nuxt/post-checks/no-modules-incompatible-with-nuxt-4.js';
import { fixture, makeNuxtProject } from './helpers.js';

describe('checkNoModulesIncompatibleWithNuxt4', () => {
  it('returns [] when packageJsonPath is null', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    const issues = await checkNoModulesIncompatibleWithNuxt4(
      makeNuxtProject({ rootDirectory: dir, packageJsonPath: null }),
    );
    expect(issues).toEqual([]);
  });

  it('returns [] when the package.json is missing on disk', async () => {
    const dir = await fixture({ 'other.txt': '' });
    const issues = await checkNoModulesIncompatibleWithNuxt4(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
    );
    expect(issues).toEqual([]);
  });

  it('returns [] for a clean modern dependency set', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        dependencies: { nuxt: '^4.4.0' },
      }),
    });
    const issues = await checkNoModulesIncompatibleWithNuxt4(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
    );
    expect(issues).toEqual([]);
  });

  it('warns on a known Nuxt-3-only module in dependencies', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        dependencies: { '@nuxtjs/composition-api': '^0.33.1' },
      }),
    });
    const issues = await checkNoModulesIncompatibleWithNuxt4(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
    );
    expect(issues).toHaveLength(1);
    const issue = issues[0]!;
    expect(issue.ruleId).toBe(
      'nuxt-doctor/modules-deps/no-modules-incompatible-with-nuxt-4',
    );
    expect(issue.severity).toBe('warn');
    expect(issue.file).toBe(join(dir, 'package.json'));
    expect(issue.line).toBe(1);
    expect(issue.message).toContain('@nuxtjs/composition-api');
    expect(issue.recommendation).toBeTruthy();
  });

  it('warns on a known incompatible module in devDependencies', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        devDependencies: { '@nuxt/bridge': '^3.0.0' },
      }),
    });
    const issues = await checkNoModulesIncompatibleWithNuxt4(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]!.message).toContain('@nuxt/bridge');
  });

  it('emits one diagnostic per incompatible module with distinct lines', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        dependencies: { '@nuxt/bridge': '^3.0.0' },
        devDependencies: { 'nuxt-property-decorator': '^3.0.0' },
      }),
    });
    const issues = await checkNoModulesIncompatibleWithNuxt4(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
    );
    expect(issues).toHaveLength(2);
    expect(new Set(issues.map((i) => i.line)).size).toBe(2);
    const names = issues.map((i) => i.message).join(' ');
    expect(names).toContain('@nuxt/bridge');
    expect(names).toContain('nuxt-property-decorator');
  });

  it('does not double-count a module present in both dep maps', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        dependencies: { '@nuxt/bridge': '^3.0.0' },
        devDependencies: { '@nuxt/bridge': '^3.0.0' },
      }),
    });
    const issues = await checkNoModulesIncompatibleWithNuxt4(
      makeNuxtProject({
        rootDirectory: dir,
        packageJsonPath: join(dir, 'package.json'),
      }),
    );
    expect(issues).toHaveLength(1);
  });
});
