import { describe, expect, it } from 'vite-plus/test';
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
});
