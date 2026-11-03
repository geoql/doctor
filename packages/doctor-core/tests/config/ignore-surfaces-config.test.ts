import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import { InvalidConfigError } from '../../src/config/errors.js';
import { loadDoctorConfig } from '../../src/config/load.js';
import { mergeCliOverrides } from '../../src/config/merge-cli-overrides.js';
import { validateConfig } from '../../src/config/validate.js';
import type { DoctorUserConfig } from '../../src/config/types.js';

describe('config schema — ignore + surfaces', () => {
  it('accepts a full ignore + surfaces block', () => {
    expect(() =>
      validateConfig({
        ignore: {
          rules: ['vue-doctor/security/no-v-html'],
          files: ['src/legacy/**'],
          tags: ['design', 'test-noise'],
          overrides: [
            { files: ['src/gen/**'] },
            {
              files: ['src/ui/**'],
              rules: ['vue-doctor/design/no-raw-hex-color'],
            },
          ],
        },
        surfaces: {
          cli: { excludeTags: ['design'] },
          score: { includeRules: ['vue-doctor/design/no-missing-alt'] },
          prComment: { excludeCategories: ['dead-code'] },
          ciGate: { excludeRules: ['vue-doctor/no-em-dash-in-string'] },
        },
      } as DoctorUserConfig),
    ).not.toThrow();
  });

  it.each([
    [{ ignore: { rules: ['nope/rule'] } }, 'ignore.rules.0'],
    [
      { ignore: { overrides: [{ files: ['a'], rules: ['nope/rule'] }] } },
      'ignore.overrides.0.rules.0',
    ],
    [
      { surfaces: { score: { includeRules: ['nope/rule'] } } },
      'surfaces.score',
    ],
    [{ surfaces: { cli: { excludeRules: ['nope/rule'] } } }, 'surfaces.cli'],
  ])('rejects unknown rule ids (%j)', (config, path) => {
    expect(() => validateConfig(config as DoctorUserConfig)).toThrow(
      InvalidConfigError,
    );
    expect(() => validateConfig(config as DoctorUserConfig)).toThrow(path);
  });

  it('rejects unknown tags and empty override file lists', () => {
    expect(() =>
      validateConfig({ ignore: { tags: ['nope'] } } as never),
    ).toThrow(InvalidConfigError);
    expect(() =>
      validateConfig({ ignore: { overrides: [{ files: [] }] } } as never),
    ).toThrow(InvalidConfigError);
  });
});

describe('loadDoctorConfig — ignore', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'doctor-ignore-config-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function write(config: DoctorUserConfig): void {
    writeFileSync(join(dir, 'doctor.config.json'), JSON.stringify(config));
  }

  it('turns off every rule carrying an ignored tag unless set explicitly', async () => {
    write({
      preset: 'all',
      ignore: { tags: ['design'] },
      rules: { 'vue-doctor/design/no-missing-alt': 'error' },
    });
    const resolved = await loadDoctorConfig(dir);
    expect(
      resolved.rules['vue-doctor/design/no-raw-hex-color'],
    ).toBeUndefined();
    expect(resolved.rules['vue-doctor/design/no-missing-alt']).toBe('error');
    expect(resolved.rules['vue-doctor/security/no-v-html']).toBeDefined();
  });

  it('appends ignore.files to exclude and passes ignore/surfaces through', async () => {
    write({
      exclude: ['**/node_modules/**'],
      ignore: { files: ['src/legacy/**'] },
      surfaces: { cli: { excludeTags: ['design'] } },
    });
    const resolved = await loadDoctorConfig(dir);
    expect(resolved.exclude).toEqual(['**/node_modules/**', 'src/legacy/**']);
    expect(resolved.ignore).toEqual({ files: ['src/legacy/**'] });
    expect(resolved.surfaces).toEqual({ cli: { excludeTags: ['design'] } });
    const merged = mergeCliOverrides(resolved, {});
    expect(merged.ignore).toEqual(resolved.ignore);
    expect(merged.surfaces).toEqual(resolved.surfaces);
  });

  it('leaves ignore/surfaces absent when not configured', async () => {
    write({ preset: 'recommended' });
    const resolved = await loadDoctorConfig(dir);
    expect('ignore' in resolved).toBe(false);
    expect('surfaces' in resolved).toBe(false);
    const merged = mergeCliOverrides(resolved, {});
    expect('ignore' in merged).toBe(false);
    expect('surfaces' in merged).toBe(false);
  });
});
