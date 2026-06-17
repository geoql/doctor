import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  DoctorUserConfigSchema,
  LevelSchema,
  RuleEntrySchema,
  buildJsonSchema,
} from '../../src/config/schema.js';
import { RULE_REGISTRY } from '../../src/rule-registry.js';

describe('LevelSchema', () => {
  it('accepts the four severity levels', () => {
    for (const level of ['error', 'warn', 'info', 'off']) {
      expect(LevelSchema.safeParse(level).success).toBe(true);
    }
  });

  it('rejects an unknown level', () => {
    expect(LevelSchema.safeParse('critical').success).toBe(false);
  });
});

describe('RuleEntrySchema', () => {
  it('accepts a bare severity string', () => {
    expect(RuleEntrySchema.safeParse('error').success).toBe(true);
    expect(RuleEntrySchema.safeParse('off').success).toBe(true);
  });

  it('rejects a non-severity value', () => {
    expect(RuleEntrySchema.safeParse('nope').success).toBe(false);
    expect(RuleEntrySchema.safeParse(42).success).toBe(false);
  });
});

describe('DoctorUserConfigSchema', () => {
  it('parses a valid empty config', () => {
    expect(DoctorUserConfigSchema.safeParse({}).success).toBe(true);
  });

  it('parses a valid full config with a real rule id', () => {
    const realId = RULE_REGISTRY[0]!.id;
    const result = DoctorUserConfigSchema.safeParse({
      rootDir: '/x',
      include: ['src/**/*.vue'],
      exclude: ['dist'],
      failOn: 'warn',
      threshold: 50,
      preset: 'recommended',
      extends: ['./base'],
      fixExcludes: ['vue/no-import-compiler-macros'],
      rules: { [realId]: 'error' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts and preserves a $schema field', () => {
    const result = DoctorUserConfigSchema.safeParse({
      $schema: 'https://docs.the-doctor.report/schema.json',
      threshold: 10,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.$schema).toBe(
        'https://docs.the-doctor.report/schema.json',
      );
    }
  });

  it('rejects an invalid severity in rules', () => {
    const realId = RULE_REGISTRY[0]!.id;
    expect(
      DoctorUserConfigSchema.safeParse({ rules: { [realId]: 'critical' } })
        .success,
    ).toBe(false);
  });

  it('rejects an unknown rule id', () => {
    const result = DoctorUserConfigSchema.safeParse({
      rules: { 'totally/unknown': 'error' },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('rules'))).toBe(
        true,
      );
    }
  });

  it('rejects a non-integer threshold', () => {
    expect(DoctorUserConfigSchema.safeParse({ threshold: 3.5 }).success).toBe(
      false,
    );
  });

  it('rejects a threshold out of range', () => {
    expect(DoctorUserConfigSchema.safeParse({ threshold: -1 }).success).toBe(
      false,
    );
    expect(DoctorUserConfigSchema.safeParse({ threshold: 150 }).success).toBe(
      false,
    );
  });

  it('rejects an invalid failOn', () => {
    expect(DoctorUserConfigSchema.safeParse({ failOn: 'info' }).success).toBe(
      false,
    );
  });

  it('rejects an invalid preset', () => {
    expect(DoctorUserConfigSchema.safeParse({ preset: 'bogus' }).success).toBe(
      false,
    );
  });

  it('rejects a non-array include', () => {
    expect(DoctorUserConfigSchema.safeParse({ include: 'src' }).success).toBe(
      false,
    );
  });

  it('rejects a non-object root', () => {
    expect(DoctorUserConfigSchema.safeParse(null).success).toBe(false);
    expect(DoctorUserConfigSchema.safeParse([]).success).toBe(false);
    expect(DoctorUserConfigSchema.safeParse('bad').success).toBe(false);
  });

  it('allows unknown top-level fields (forward-compatible)', () => {
    expect(
      DoctorUserConfigSchema.safeParse({ unknownField: 'x', threshold: 10 })
        .success,
    ).toBe(true);
  });
});

describe('buildJsonSchema', () => {
  it('produces a JSON Schema that enumerates every registered rule id', () => {
    const json = buildJsonSchema();
    const ruleProps = (
      json.properties as Record<
        string,
        { properties?: Record<string, unknown> }
      >
    ).rules?.properties;
    expect(ruleProps).toBeDefined();
    for (const rule of RULE_REGISTRY) {
      expect(ruleProps).toHaveProperty(rule.id);
    }
  });

  it('declares the $schema property', () => {
    const json = buildJsonSchema();
    expect(json.properties).toHaveProperty('$schema');
  });

  it('is a draft JSON Schema object', () => {
    const json = buildJsonSchema();
    expect(json).toMatchObject({ type: 'object' });
    expect(typeof json).toBe('object');
  });

  it('round-trips through z.toJSONSchema without throwing', () => {
    expect(() => z.toJSONSchema(DoctorUserConfigSchema)).not.toThrow();
  });
});
