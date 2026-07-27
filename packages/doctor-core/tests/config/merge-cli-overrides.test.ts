import { describe, expect, it } from 'vitest';
import type { ResolvedDoctorConfig } from '../../src/config/types.js';
import { mergeCliOverrides } from '../../src/config/merge-cli-overrides.js';
import type { Severity } from '../../src/types.js';

const baseResolved: ResolvedDoctorConfig = {
  rootDir: '/project',
  include: ['src/**/*.vue'],
  exclude: ['dist'],
  failOn: 'error',
  threshold: 50,
  rules: { 'foo/bar': 'error' as Severity, 'baz/qux': 'warn' as Severity },
  source: 'json',
  configFile: '/project/doctor.config.json',
};

describe('mergeCliOverrides', () => {
  it('returns resolved unchanged when no CLI overrides are given', () => {
    const result = mergeCliOverrides(baseResolved, {});
    expect(result).toEqual(baseResolved);
  });

  it('overrides include when provided', () => {
    const result = mergeCliOverrides(baseResolved, {
      include: ['lib/**/*.ts'],
    });
    expect(result.include).toEqual(['lib/**/*.ts']);
    expect(result.exclude).toBe(baseResolved.exclude);
  });

  it('overrides exclude when provided', () => {
    const result = mergeCliOverrides(baseResolved, {
      exclude: ['node_modules'],
    });
    expect(result.exclude).toEqual(['node_modules']);
    expect(result.include).toBe(baseResolved.include);
  });

  it('overrides failOn when provided', () => {
    const result = mergeCliOverrides(baseResolved, { failOn: 'warn' });
    expect(result.failOn).toBe('warn');
  });

  it('overrides threshold when provided', () => {
    const result = mergeCliOverrides(baseResolved, { threshold: 80 });
    expect(result.threshold).toBe(80);
  });

  it('overrides multiple fields at once', () => {
    const result = mergeCliOverrides(baseResolved, {
      failOn: 'warn',
      threshold: 90,
      include: ['**/*.ts'],
    });
    expect(result.failOn).toBe('warn');
    expect(result.threshold).toBe(90);
    expect(result.include).toEqual(['**/*.ts']);
    expect(result.exclude).toBe(baseResolved.exclude);
  });

  it('adds new rules from CLI overrides', () => {
    const result = mergeCliOverrides(baseResolved, {
      rules: { 'new/rule': 'info' as Severity },
    });
    expect(result.rules['new/rule']).toBe('info');
    expect(result.rules['foo/bar']).toBe('error');
  });

  it('overrides existing rule severities from CLI', () => {
    const result = mergeCliOverrides(baseResolved, {
      rules: { 'foo/bar': 'warn' as Severity },
    });
    expect(result.rules['foo/bar']).toBe('warn');
  });

  it('drops rules when CLI sets them to off', () => {
    const result = mergeCliOverrides(baseResolved, {
      rules: { 'baz/qux': 'off' },
    });
    expect(result.rules).not.toHaveProperty('baz/qux');
    expect(result.rules['foo/bar']).toBe('error');
  });

  it('drops rules with off and adds new ones simultaneously', () => {
    const result = mergeCliOverrides(baseResolved, {
      rules: {
        'baz/qux': 'off',
        'added/rule': 'info' as Severity,
      },
    });
    expect(result.rules).not.toHaveProperty('baz/qux');
    expect(result.rules['added/rule']).toBe('info');
    expect(result.rules['foo/bar']).toBe('error');
  });

  it('preserves source and configFile from resolved', () => {
    const result = mergeCliOverrides(baseResolved, { threshold: 99 });
    expect(result.source).toBe('json');
    expect(result.configFile).toBe('/project/doctor.config.json');
  });

  it('preserves rootDir from resolved', () => {
    const result = mergeCliOverrides(baseResolved, { threshold: 99 });
    expect(result.rootDir).toBe('/project');
  });

  it('does not mutate the original resolved object', () => {
    const original = { ...baseResolved, rules: { ...baseResolved.rules } };
    mergeCliOverrides(baseResolved, { threshold: 99 });
    expect(baseResolved.threshold).toBe(original.threshold);
  });

  it('adds fixExcludes from CLI overrides', () => {
    const result = mergeCliOverrides(baseResolved, {
      fixExcludes: ['vue/no-import-compiler-macros'],
    });
    expect(result.fixExcludes).toEqual(['vue/no-import-compiler-macros']);
  });

  it('CLI fixExcludes overrides config fixExcludes', () => {
    const withConfig: ResolvedDoctorConfig = {
      ...baseResolved,
      fixExcludes: ['from/config'],
    };
    const result = mergeCliOverrides(withConfig, {
      fixExcludes: ['from/cli'],
    });
    expect(result.fixExcludes).toEqual(['from/cli']);
  });

  it('preserves config fixExcludes when CLI does not override', () => {
    const withConfig: ResolvedDoctorConfig = {
      ...baseResolved,
      fixExcludes: ['from/config'],
    };
    const result = mergeCliOverrides(withConfig, { threshold: 70 });
    expect(result.fixExcludes).toEqual(['from/config']);
  });

  it('omits fixExcludes when neither config nor CLI provide it', () => {
    const result = mergeCliOverrides(baseResolved, {});
    expect(result.fixExcludes).toBeUndefined();
  });

  it('takes includeTestFiles from the CLI over the config file', () => {
    const withConfig: ResolvedDoctorConfig = {
      ...baseResolved,
      includeTestFiles: false,
    };
    const result = mergeCliOverrides(withConfig, { includeTestFiles: true });
    expect(result.includeTestFiles).toBe(true);
  });

  it('keeps includeTestFiles from the config file when the CLI omits it', () => {
    const withConfig: ResolvedDoctorConfig = {
      ...baseResolved,
      includeTestFiles: true,
    };
    const result = mergeCliOverrides(withConfig, {});
    expect(result.includeTestFiles).toBe(true);
  });

  it('omits includeTestFiles when neither config nor CLI provide it', () => {
    const result = mergeCliOverrides(baseResolved, {});
    expect(result.includeTestFiles).toBeUndefined();
  });
});
