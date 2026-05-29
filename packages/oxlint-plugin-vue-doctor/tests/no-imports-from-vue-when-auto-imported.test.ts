import { describe, expect, it } from 'vitest';
import { noImportsFromVueWhenAutoImported } from '../src/rules/ai-slop/no-imports-from-vue-when-auto-imported.js';
import { runRule } from './run-rule.js';

const rule = noImportsFromVueWhenAutoImported;
const GATED = { capabilities: ['auto-imports:vue'] };

describe('no-imports-from-vue-when-auto-imported', () => {
  it('does NOT fire without the auto-imports:vue capability', () => {
    const reports = runRule(rule, `import { ref } from 'vue';`);
    expect(reports).toEqual([]);
  });

  it('flags a single auto-imported named import (whole statement)', () => {
    const reports = runRule(rule, `import { ref } from 'vue';`, GATED);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('auto-imported');
  });

  it('flags the whole statement when all specifiers are auto-imported', () => {
    const reports = runRule(
      rule,
      `import { ref, computed, watch } from 'vue';`,
      GATED,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('entire import');
  });

  it('flags only the offending specifier in a mixed import', () => {
    const reports = runRule(
      rule,
      `import { ref, type Ref } from 'vue';`,
      GATED,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]!.type).toBe('ImportSpecifier');
  });

  it('flags an aliased auto-imported symbol by its original name', () => {
    const reports = runRule(rule, `import { ref as vRef } from 'vue';`, GATED);
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire on a non-auto-imported named import', () => {
    const reports = runRule(rule, `import { Component } from 'vue';`, GATED);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a type-only import declaration', () => {
    const reports = runRule(rule, `import type { Ref } from 'vue';`, GATED);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a default import', () => {
    const reports = runRule(rule, `import Vue from 'vue';`, GATED);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a namespace import', () => {
    const reports = runRule(rule, `import * as Vue from 'vue';`, GATED);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a side-effect import', () => {
    const reports = runRule(rule, `import 'vue';`, GATED);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on imports from other modules', () => {
    const reports = runRule(rule, `import { ref } from 'vue-router';`, GATED);
    expect(reports).toEqual([]);
  });

  it('does NOT count type-only specifiers toward the all-auto-imported case', () => {
    const reports = runRule(
      rule,
      `import { ref, computed, type Ref } from 'vue';`,
      GATED,
    );
    expect(reports).toHaveLength(2);
    expect(reports.every((r) => r.type === 'ImportSpecifier')).toBe(true);
  });
});
