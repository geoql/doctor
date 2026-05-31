import { describe, expect, it } from 'vitest';
import {
  audit,
  checkNuxtProject,
  defineConfig,
  format,
  isNuxtLayoutFile,
  isNuxtPageFile,
  isNuxtServerFile,
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

  it('exposes checkNuxtProject as a function', () => {
    expect(typeof checkNuxtProject).toBe('function');
  });

  it('exposes the nuxt file-role classifiers from the package index', () => {
    expect(isNuxtPageFile('app/pages/index.vue')).toBe(true);
    expect(isNuxtServerFile('server/api/x.ts')).toBe(true);
    expect(isNuxtLayoutFile('layouts/default.vue')).toBe(true);
  });

  it('exposes the oxlint spawn error classes', () => {
    expect(new OxlintSpawnFailed(1, 'x')).toBeInstanceOf(Error);
    expect(new OxlintOutputTooLarge(10)).toBeInstanceOf(Error);
  });
});
