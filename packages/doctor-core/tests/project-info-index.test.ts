import { describe, expect, it } from 'vitest';
import {
  detectProject as detectFromBarrel,
  findMonorepoRoot,
  parseNuxtConfig,
  parseNuxtVersion,
  parseVueVersion,
  pathExists,
  readPackageJson,
  resolveDepVersion,
} from '../src/project-info/index.js';
import { detectProject } from '../src/index.js';

describe('project-info barrel and package index re-exports', () => {
  it('re-exports every detection helper as a function from the barrel', () => {
    for (const fn of [
      readPackageJson,
      pathExists,
      findMonorepoRoot,
      resolveDepVersion,
      parseVueVersion,
      parseNuxtVersion,
      parseNuxtConfig,
      detectFromBarrel,
    ]) {
      expect(typeof fn).toBe('function');
    }
  });

  it('re-exports detectProject from the package index', () => {
    expect(typeof detectProject).toBe('function');
    expect(detectProject).toBe(detectFromBarrel);
  });
});
