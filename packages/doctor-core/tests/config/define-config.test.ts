import { describe, expect, it } from 'vitest';
import { defineConfig } from '../../src/config/define-config.js';
import type { DoctorUserConfig } from '../../src/config/types.js';

describe('defineConfig', () => {
  it('returns its input unchanged', () => {
    const config: DoctorUserConfig = {
      include: ['src/**/*.vue'],
      threshold: 80,
      rules: { 'foo/bar': 'error' },
    };
    const result = defineConfig(config);
    expect(result).toBe(config);
  });

  it('returns an empty object unchanged', () => {
    const config: DoctorUserConfig = {};
    const result = defineConfig(config);
    expect(result).toEqual({});
  });

  it('preserves all fields including extends', () => {
    const config: DoctorUserConfig = {
      extends: ['./presets/strict'],
      failOn: 'warn',
      exclude: ['dist'],
    };
    const result = defineConfig(config);
    expect(result).toEqual(config);
  });
});
