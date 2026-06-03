import { writeFileSync } from 'node:fs';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ConfigCycleError,
  ConfigFileNotFoundError,
  InvalidConfigError,
} from '../../src/config/errors.js';
import { loadDoctorConfig } from '../../src/config/load.js';

function makeDir(): string {
  return mkdtempSync(join(tmpdir(), 'doctor-cfg-'));
}

describe('loadDoctorConfig', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = makeDir();
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('returns built-in config with source built-in when no config exists', async () => {
    const result = await loadDoctorConfig(tmp);
    expect(result.source).toBe('built-in');
    expect(result.rootDir).toBe(tmp);
    expect(result.threshold).toBe(0);
    expect(result.failOn).toBe('error');
    expect(result.include).toEqual([
      '**/*.vue',
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
    ]);
    expect(result.exclude).toEqual([
      'node_modules',
      'dist',
      '.nuxt',
      '.output',
      'coverage',
    ]);
    expect(result.preset).toBe('recommended');
    // recommended preset includes error + warn rules from RULE_REGISTRY
    expect(Object.keys(result.rules).length).toBeGreaterThan(0);
    for (const sev of Object.values(result.rules)) {
      expect(sev === 'error' || sev === 'warn').toBe(true);
    }
    expect(result.configFile).toBeUndefined();
  });

  it('resolves fixExcludes from a config file', async () => {
    writeFileSync(
      join(tmp, 'doctor.config.json'),
      JSON.stringify({ fixExcludes: ['vue/no-import-compiler-macros'] }),
    );
    const result = await loadDoctorConfig(tmp);
    expect(result.fixExcludes).toEqual(['vue/no-import-compiler-macros']);
  });

  it('leaves fixExcludes undefined when not declared', async () => {
    const result = await loadDoctorConfig(tmp);
    expect(result.fixExcludes).toBeUndefined();
  });

  it('loads a JSON config file and tags source as json', async () => {
    writeFileSync(
      join(tmp, 'doctor.config.json'),
      JSON.stringify({ threshold: 65, failOn: 'warn' }),
    );
    const result = await loadDoctorConfig(tmp);
    expect(result.source).toBe('json');
    expect(result.threshold).toBe(65);
    expect(result.failOn).toBe('warn');
    expect(result.configFile).toBeDefined();
    expect(result.configFile).toContain('doctor.config.json');
  });

  it('loads an mjs config file and tags source as mjs', async () => {
    writeFileSync(
      join(tmp, 'doctor.config.mjs'),
      'export default { threshold: 75 }',
    );
    const result = await loadDoctorConfig(tmp);
    expect(result.source).toBe('mjs');
    expect(result.threshold).toBe(75);
  });

  it('loads a js config file and tags source as js', async () => {
    writeFileSync(
      join(tmp, 'doctor.config.js'),
      'export default { threshold: 70 }',
    );
    const result = await loadDoctorConfig(tmp);
    expect(result.source).toBe('js');
    expect(result.threshold).toBe(70);
  });

  it('loads a ts config file and tags source as ts', async () => {
    writeFileSync(
      join(tmp, 'doctor.config.ts'),
      'export default { threshold: 80 }',
    );
    const result = await loadDoctorConfig(tmp);
    expect(result.source).toBe('ts');
    expect(result.threshold).toBe(80);
  });

  it('loads package.json#doctor and tags source as package.json', async () => {
    writeFileSync(
      join(tmp, 'package.json'),
      JSON.stringify({ name: 'test', doctor: { threshold: 60 } }),
    );
    const result = await loadDoctorConfig(tmp);
    expect(result.source).toBe('package.json');
    expect(result.threshold).toBe(60);
    expect(result.configFile).toContain('package.json');
  });

  it('prefers ts over json when both exist', async () => {
    writeFileSync(
      join(tmp, 'doctor.config.ts'),
      'export default { threshold: 80 }',
    );
    writeFileSync(
      join(tmp, 'doctor.config.json'),
      JSON.stringify({ threshold: 65 }),
    );
    const result = await loadDoctorConfig(tmp);
    expect(result.source).toBe('ts');
    expect(result.threshold).toBe(80);
  });

  it('prefers js over mjs when both exist (c12 resolution order)', async () => {
    writeFileSync(
      join(tmp, 'doctor.config.mjs'),
      'export default { threshold: 75 }',
    );
    writeFileSync(
      join(tmp, 'doctor.config.js'),
      'export default { threshold: 70 }',
    );
    const result = await loadDoctorConfig(tmp);
    expect(result.source).toBe('js');
    expect(result.threshold).toBe(70);
  });

  it('prefers file config over package.json#doctor', async () => {
    writeFileSync(
      join(tmp, 'doctor.config.json'),
      JSON.stringify({ threshold: 65 }),
    );
    writeFileSync(
      join(tmp, 'package.json'),
      JSON.stringify({ name: 'test', doctor: { threshold: 60 } }),
    );
    const result = await loadDoctorConfig(tmp);
    expect(result.source).toBe('json');
    expect(result.threshold).toBe(65);
  });

  it('throws ConfigFileNotFoundError when explicitPath does not exist', async () => {
    const missing = join(tmp, 'no-such-file.ts');
    await expect(() => loadDoctorConfig(tmp, missing)).rejects.toThrow(
      ConfigFileNotFoundError,
    );
    await expect(() => loadDoctorConfig(tmp, missing)).rejects.toThrow(missing);
  });

  it('loads an explicit config file with source flag', async () => {
    const customPath = join(tmp, 'custom.config.mjs');
    writeFileSync(customPath, 'export default { threshold: 99 }');
    const result = await loadDoctorConfig(tmp, customPath);
    expect(result.source).toBe('flag');
    expect(result.threshold).toBe(99);
    expect(result.configFile).toBe(customPath);
  });

  it('explicit flag wins over a file at cwd', async () => {
    writeFileSync(
      join(tmp, 'doctor.config.json'),
      JSON.stringify({ threshold: 50 }),
    );
    const customPath = join(tmp, 'custom.config.mjs');
    writeFileSync(customPath, 'export default { threshold: 99 }');
    const result = await loadDoctorConfig(tmp, customPath);
    expect(result.source).toBe('flag');
    expect(result.threshold).toBe(99);
  });

  it('throws InvalidConfigError when presetOverride is not a known preset name', async () => {
    await expect(
      loadDoctorConfig(tmp, { presetOverride: 'bogus' }),
    ).rejects.toThrow(/preset: must be one of/);
  });

  it('throws InvalidConfigError when config file declares an unknown preset', async () => {
    writeFileSync(
      join(tmp, 'doctor.config.json'),
      JSON.stringify({ preset: 'bogus' }),
    );
    await expect(loadDoctorConfig(tmp)).rejects.toThrow(
      /preset: must be one of/,
    );
  });

  it('config file preset is honored when no CLI override is given', async () => {
    writeFileSync(
      join(tmp, 'doctor.config.json'),
      JSON.stringify({ preset: 'strict' }),
    );
    const result = await loadDoctorConfig(tmp);
    expect(result.preset).toBe('strict');
  });

  it('CLI presetOverride wins over config file preset', async () => {
    writeFileSync(
      join(tmp, 'doctor.config.json'),
      JSON.stringify({ preset: 'minimal' }),
    );
    const result = await loadDoctorConfig(tmp, { presetOverride: 'strict' });
    expect(result.preset).toBe('strict');
  });

  it('user overrides merge on top of preset; off explicitly removes a rule', async () => {
    // Pick a real rule from the registry that recommended preset includes.
    const registeredErrorRule = 'vue-doctor/template/v-for-has-key';
    writeFileSync(
      join(tmp, 'doctor.config.json'),
      JSON.stringify({
        rules: { 'foo/bar': 'error', [registeredErrorRule]: 'off' },
      }),
    );
    const result = await loadDoctorConfig(tmp);
    // User-added rule appears.
    expect(result.rules['foo/bar']).toBe('error');
    // User-off-ed rule is removed from the preset base.
    expect(result.rules).not.toHaveProperty(registeredErrorRule);
  });

  it('merges user config over built-in defaults', async () => {
    writeFileSync(
      join(tmp, 'doctor.config.json'),
      JSON.stringify({
        include: ['src/**/*.vue'],
        threshold: 80,
        failOn: 'warn',
      }),
    );
    const result = await loadDoctorConfig(tmp);
    expect(result.include).toEqual(['src/**/*.vue']);
    expect(result.threshold).toBe(80);
    expect(result.failOn).toBe('warn');
    expect(result.exclude).toEqual([
      'node_modules',
      'dist',
      '.nuxt',
      '.output',
      'coverage',
    ]);
  });

  it('throws InvalidConfigError for an invalid threshold', async () => {
    writeFileSync(
      join(tmp, 'doctor.config.json'),
      JSON.stringify({ threshold: 150 }),
    );
    await expect(() => loadDoctorConfig(tmp)).rejects.toThrow(
      InvalidConfigError,
    );
    await expect(() => loadDoctorConfig(tmp)).rejects.toThrow('threshold');
  });

  it('throws InvalidConfigError for an invalid failOn', async () => {
    writeFileSync(
      join(tmp, 'doctor.config.json'),
      JSON.stringify({ failOn: 'info' }),
    );
    await expect(() => loadDoctorConfig(tmp)).rejects.toThrow(
      InvalidConfigError,
    );
    await expect(() => loadDoctorConfig(tmp)).rejects.toThrow('failOn');
  });

  it('throws ConfigCycleError on extends cycle', async () => {
    writeFileSync(
      join(tmp, 'doctor.config.mjs'),
      'export default { extends: ["./a.mjs"] }',
    );
    writeFileSync(
      join(tmp, 'a.mjs'),
      'export default { extends: ["./b.mjs"], threshold: 1 }',
    );
    writeFileSync(
      join(tmp, 'b.mjs'),
      'export default { extends: ["./a.mjs"], threshold: 2 }',
    );
    await expect(() => loadDoctorConfig(tmp)).rejects.toThrow(ConfigCycleError);
  });

  it('merges extends via c12 layering', async () => {
    writeFileSync(
      join(tmp, 'doctor.config.mjs'),
      'export default { extends: ["./base.mjs"], threshold: 90 }',
    );
    writeFileSync(
      join(tmp, 'base.mjs'),
      'export default { threshold: 10, failOn: "error", exclude: ["x"] }',
    );
    const result = await loadDoctorConfig(tmp);
    expect(result.threshold).toBe(90);
    expect(result.failOn).toBe('error');
    expect(result.exclude).toContain('x');
  });

  it('sets rootDir to the provided rootDir', async () => {
    const result = await loadDoctorConfig(tmp);
    expect(result.rootDir).toBe(tmp);
  });

  it('resolves relative explicitPath against rootDir', async () => {
    const customPath = 'custom.config.mjs';
    writeFileSync(join(tmp, customPath), 'export default { threshold: 42 }');
    const result = await loadDoctorConfig(tmp, customPath);
    expect(result.source).toBe('flag');
    expect(result.threshold).toBe(42);
  });

  it('tags source as json for unknown config file extensions via explicit flag', async () => {
    const customPath = join(tmp, 'doctor.config.cjs');
    writeFileSync(customPath, 'module.exports = { threshold: 55 }');
    const result = await loadDoctorConfig(tmp, customPath);
    expect(result.source).toBe('flag');
    expect(result.threshold).toBe(55);
  });
});
