import { describe, expect, it } from 'vitest';
import { validateConfig } from '../../src/config/validate.js';
import { RULE_REGISTRY } from '../../src/rule-registry.js';
import { legacyValidateConfig } from './legacy-validate.js';

// Behavioral-parity guard: the zod-based validateConfig must make the SAME
// accept/reject decision as the frozen legacy validator on every real-world
// config. The single intended divergence — unknown rule ids, which zod now
// rejects — is deliberately kept OUT of this corpus and tested separately.

const realErrorId = RULE_REGISTRY.find((r) => r.severity === 'error')!.id;
const realWarnId = RULE_REGISTRY.find((r) => r.severity === 'warn')!.id;

const corpus: { name: string; config: unknown }[] = [
  { name: 'empty', config: {} },
  { name: 'threshold-0', config: { threshold: 0 } },
  { name: 'threshold-100', config: { threshold: 100 } },
  { name: 'threshold-50', config: { threshold: 50 } },
  { name: 'threshold-neg', config: { threshold: -1 } },
  { name: 'threshold-over', config: { threshold: 150 } },
  { name: 'threshold-float', config: { threshold: 3.5 } },
  { name: 'threshold-string', config: { threshold: 'high' } },
  { name: 'failOn-error', config: { failOn: 'error' } },
  { name: 'failOn-warn', config: { failOn: 'warn' } },
  { name: 'failOn-none', config: { failOn: 'none' } },
  { name: 'failOn-bad', config: { failOn: 'info' } },
  { name: 'failOn-number', config: { failOn: 42 } },
  { name: 'preset-recommended', config: { preset: 'recommended' } },
  { name: 'preset-strict', config: { preset: 'strict' } },
  { name: 'preset-all', config: { preset: 'all' } },
  { name: 'preset-minimal', config: { preset: 'minimal' } },
  { name: 'preset-bad', config: { preset: 'bogus' } },
  {
    name: 'include-valid',
    config: { include: ['src/**/*.vue', 'lib/**/*.ts'] },
  },
  { name: 'include-string', config: { include: 'src' } },
  { name: 'include-mixed', config: { include: ['src', 42] } },
  { name: 'exclude-valid', config: { exclude: ['node_modules', 'dist'] } },
  { name: 'exclude-string', config: { exclude: 'dist' } },
  { name: 'exclude-mixed', config: { exclude: ['dist', true] } },
  { name: 'fixExcludes-valid', config: { fixExcludes: [realWarnId] } },
  { name: 'fixExcludes-empty', config: { fixExcludes: [] } },
  { name: 'fixExcludes-string', config: { fixExcludes: 'bad' } },
  { name: 'fixExcludes-mixed', config: { fixExcludes: ['x', 42] } },
  { name: 'rules-empty', config: { rules: {} } },
  {
    name: 'rules-real',
    config: { rules: { [realErrorId]: 'error', [realWarnId]: 'off' } },
  },
  {
    name: 'rules-all-severities',
    config: { rules: { [realErrorId]: 'info' } },
  },
  {
    name: 'rules-bad-severity',
    config: { rules: { [realErrorId]: 'critical' } },
  },
  { name: 'rules-number-value', config: { rules: { [realErrorId]: 42 } } },
  { name: 'rules-string', config: { rules: 'bad' } },
  { name: 'rules-array', config: { rules: [] } },
  { name: 'null', config: null },
  { name: 'array', config: [] },
  { name: 'string', config: 'bad' },
  { name: 'number', config: 42 },
  {
    name: 'unknown-field-ignored',
    config: { unknownField: 'x', threshold: 50 },
  },
  {
    name: 'real-world-full',
    config: {
      include: ['app/**/*.vue', 'app/**/*.ts'],
      exclude: ['node_modules', 'dist', '.nuxt'],
      failOn: 'error',
      threshold: 80,
      preset: 'recommended',
      rules: { [realErrorId]: 'warn', [realWarnId]: 'off' },
      fixExcludes: [realWarnId],
    },
  },
];

function decision(fn: (raw: unknown) => void, config: unknown): boolean {
  try {
    fn(config);
    return true; // accepted
  } catch {
    return false; // rejected
  }
}

describe('validateConfig behavioral parity with legacy validator', () => {
  for (const { name, config } of corpus) {
    it(`agrees on accept/reject for: ${name}`, () => {
      const legacy = decision(legacyValidateConfig, config);
      const next = decision(validateConfig, config);
      expect(next).toBe(legacy);
    });
  }
});
