import { describe, expect, it } from 'vitest';
import { audit, defineConfig, format, loadDoctorConfig } from '../src/index.js';

describe('package index re-exports', () => {
  it('exposes audit, loadDoctorConfig, defineConfig and format as functions', () => {
    expect(typeof audit).toBe('function');
    expect(typeof loadDoctorConfig).toBe('function');
    expect(typeof defineConfig).toBe('function');
    expect(typeof format).toBe('function');
  });
});
