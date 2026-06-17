import { describe, expect, it } from 'vitest';
import { InvalidConfigError } from '../../src/config/errors.js';
import { validateConfig } from '../../src/config/validate.js';
import { RULE_REGISTRY } from '../../src/rule-registry.js';

const REAL_ERROR_ID = RULE_REGISTRY.find((r) => r.severity === 'error')!.id;
const REAL_WARN_ID = RULE_REGISTRY.find((r) => r.severity === 'warn')!.id;
const REAL_INFO_ID = RULE_REGISTRY.find((r) => r.severity === 'info')!.id;

describe('validateConfig', () => {
  it('passes a valid empty config', () => {
    expect(() => validateConfig({})).not.toThrow();
  });

  it('passes a valid full config', () => {
    expect(() =>
      validateConfig({
        include: ['src/**/*.vue'],
        exclude: ['dist'],
        failOn: 'warn',
        threshold: 50,
        rules: { [REAL_ERROR_ID]: 'error', [REAL_WARN_ID]: 'off' },
      }),
    ).not.toThrow();
  });

  it('throws InvalidConfigError for non-object input', () => {
    expect(() => validateConfig(null)).toThrow(InvalidConfigError);
    expect(() => validateConfig(null)).toThrow('config: must be an object');
  });

  it('throws InvalidConfigError for array input', () => {
    expect(() => validateConfig([])).toThrow(InvalidConfigError);
    expect(() => validateConfig([])).toThrow('config: must be an object');
  });

  it('throws InvalidConfigError for string input', () => {
    expect(() => validateConfig('bad')).toThrow(InvalidConfigError);
  });

  it('throws InvalidConfigError for number input', () => {
    expect(() => validateConfig(42)).toThrow(InvalidConfigError);
  });

  describe('threshold', () => {
    it('rejects a non-integer threshold', () => {
      expect(() => validateConfig({ threshold: 3.5 })).toThrow(
        InvalidConfigError,
      );
      expect(() => validateConfig({ threshold: 3.5 })).toThrow('threshold');
    });

    it('rejects a threshold below 0', () => {
      expect(() => validateConfig({ threshold: -1 })).toThrow(
        InvalidConfigError,
      );
      expect(() => validateConfig({ threshold: -1 })).toThrow('threshold');
    });

    it('rejects a threshold above 100', () => {
      expect(() => validateConfig({ threshold: 150 })).toThrow(
        InvalidConfigError,
      );
      expect(() => validateConfig({ threshold: 150 })).toThrow('threshold');
    });

    it('accepts threshold 0', () => {
      expect(() => validateConfig({ threshold: 0 })).not.toThrow();
    });

    it('accepts threshold 100', () => {
      expect(() => validateConfig({ threshold: 100 })).not.toThrow();
    });

    it('rejects a non-number threshold', () => {
      expect(() => validateConfig({ threshold: 'high' })).toThrow(
        InvalidConfigError,
      );
      expect(() => validateConfig({ threshold: 'high' })).toThrow('threshold');
    });
  });

  describe('failOn', () => {
    it('rejects an invalid failOn value', () => {
      expect(() => validateConfig({ failOn: 'info' })).toThrow(
        InvalidConfigError,
      );
      expect(() => validateConfig({ failOn: 'info' })).toThrow('failOn');
    });

    it('accepts failOn error', () => {
      expect(() => validateConfig({ failOn: 'error' })).not.toThrow();
    });

    it('accepts failOn warn', () => {
      expect(() => validateConfig({ failOn: 'warn' })).not.toThrow();
    });

    it('rejects a non-string failOn', () => {
      expect(() => validateConfig({ failOn: 42 })).toThrow(InvalidConfigError);
    });
  });

  describe('include', () => {
    it('rejects a non-array include', () => {
      expect(() => validateConfig({ include: 'src' })).toThrow(
        InvalidConfigError,
      );
      expect(() => validateConfig({ include: 'src' })).toThrow('include');
    });

    it('rejects an include array with non-string entries', () => {
      expect(() => validateConfig({ include: ['src', 42] })).toThrow(
        InvalidConfigError,
      );
      expect(() => validateConfig({ include: ['src', 42] })).toThrow('include');
    });

    it('accepts a valid include array', () => {
      expect(() =>
        validateConfig({ include: ['src/**/*.vue', 'lib/**/*.ts'] }),
      ).not.toThrow();
    });
  });

  describe('exclude', () => {
    it('rejects a non-array exclude', () => {
      expect(() => validateConfig({ exclude: 'dist' })).toThrow(
        InvalidConfigError,
      );
      expect(() => validateConfig({ exclude: 'dist' })).toThrow('exclude');
    });

    it('rejects an exclude array with non-string entries', () => {
      expect(() => validateConfig({ exclude: ['dist', true] })).toThrow(
        InvalidConfigError,
      );
      expect(() => validateConfig({ exclude: ['dist', true] })).toThrow(
        'exclude',
      );
    });

    it('accepts a valid exclude array', () => {
      expect(() =>
        validateConfig({ exclude: ['node_modules', 'dist'] }),
      ).not.toThrow();
    });
  });

  describe('rules', () => {
    it('rejects a non-object rules value', () => {
      expect(() => validateConfig({ rules: 'bad' })).toThrow(
        InvalidConfigError,
      );
      expect(() => validateConfig({ rules: 'bad' })).toThrow('rules');
    });

    it('rejects an array rules value', () => {
      expect(() => validateConfig({ rules: [] })).toThrow(InvalidConfigError);
    });

    it('rejects an invalid severity in rules', () => {
      expect(() =>
        validateConfig({ rules: { [REAL_ERROR_ID]: 'critical' } }),
      ).toThrow(InvalidConfigError);
      expect(() =>
        validateConfig({ rules: { [REAL_ERROR_ID]: 'critical' } }),
      ).toThrow(`rules.${REAL_ERROR_ID}`);
    });

    it('accepts all valid severities including off', () => {
      expect(() =>
        validateConfig({
          rules: {
            [REAL_ERROR_ID]: 'error',
            [REAL_WARN_ID]: 'warn',
            [REAL_INFO_ID]: 'info',
          },
        }),
      ).not.toThrow();
    });

    it('rejects a non-string rule value', () => {
      expect(() => validateConfig({ rules: { [REAL_ERROR_ID]: 42 } })).toThrow(
        InvalidConfigError,
      );
    });

    it('rejects an unknown rule id (new zod behavior)', () => {
      expect(() =>
        validateConfig({ rules: { 'totally/unknown': 'error' } }),
      ).toThrow(InvalidConfigError);
      expect(() =>
        validateConfig({ rules: { 'totally/unknown': 'error' } }),
      ).toThrow('totally/unknown');
    });

    it('carries the zod issue list on InvalidConfigError', () => {
      try {
        validateConfig({ threshold: 150 });
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(InvalidConfigError);
        expect((err as InvalidConfigError).issues.length).toBeGreaterThan(0);
      }
    });
  });

  it('ignores unknown fields', () => {
    expect(() =>
      validateConfig({ unknownField: 'whatever', threshold: 50 }),
    ).not.toThrow();
  });

  describe('fixExcludes', () => {
    it('rejects a non-array fixExcludes', () => {
      expect(() => validateConfig({ fixExcludes: 'bad' })).toThrow(
        InvalidConfigError,
      );
      expect(() => validateConfig({ fixExcludes: 'bad' })).toThrow(
        'fixExcludes',
      );
    });

    it('rejects a fixExcludes array with non-string entries', () => {
      expect(() => validateConfig({ fixExcludes: ['rule1', 42] })).toThrow(
        InvalidConfigError,
      );
      expect(() => validateConfig({ fixExcludes: ['rule1', 42] })).toThrow(
        'fixExcludes',
      );
    });

    it('accepts a valid fixExcludes array', () => {
      expect(() =>
        validateConfig({ fixExcludes: ['vue/no-import-compiler-macros'] }),
      ).not.toThrow();
    });

    it('accepts an empty fixExcludes array', () => {
      expect(() => validateConfig({ fixExcludes: [] })).not.toThrow();
    });
  });
});
