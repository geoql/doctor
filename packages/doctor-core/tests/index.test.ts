import { describe, expect, it } from 'vitest';
import {
  audit,
  defineConfig,
  format,
  loadDoctorConfig,
  OxlintOutputTooLarge,
  OxlintSpawnFailed,
} from '../src/index.js';

describe('package index re-exports', () => {
  it('exposes audit, loadDoctorConfig, defineConfig and format as functions', () => {
    expect(typeof audit).toBe('function');
    expect(typeof loadDoctorConfig).toBe('function');
    expect(typeof defineConfig).toBe('function');
    expect(typeof format).toBe('function');
  });

  it('exposes the oxlint spawn error classes', () => {
    expect(new OxlintSpawnFailed(1, 'x')).toBeInstanceOf(Error);
    expect(new OxlintOutputTooLarge(10)).toBeInstanceOf(Error);
  });
});
