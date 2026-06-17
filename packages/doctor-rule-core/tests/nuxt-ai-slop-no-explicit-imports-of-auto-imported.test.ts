import { describe, expect, it } from 'vitest';
import { noExplicitImportsOfAutoImported } from '../src/rules/nuxt/ai-slop/no-explicit-imports-of-auto-imported.js';
import { runRule } from './run-rule.js';

const rule = noExplicitImportsOfAutoImported;

describe('ai-slop/no-explicit-imports-of-auto-imported', () => {
  it('fires on import from vue of auto-imported symbol', () => {
    const reports = runRule(rule, `import { ref } from 'vue';`);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('auto-imported');
  });

  it('fires on import from #imports', () => {
    const reports = runRule(rule, `import { useRoute } from '#imports';`);
    expect(reports).toHaveLength(1);
  });

  it('fires on import from vue-router', () => {
    const reports = runRule(rule, `import { useRoute } from 'vue-router';`);
    expect(reports).toHaveLength(1);
  });

  it('fires on import from #app', () => {
    const reports = runRule(rule, `import { useNuxtApp } from '#app';`);
    expect(reports).toHaveLength(1);
  });

  it('fires once when ALL specifiers are auto-imported', () => {
    const reports = runRule(rule, `import { ref, unref } from 'vue';`);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.type).toBe('ImportDeclaration');
  });

  it('fires once for all-auto-imported import', () => {
    const reports = runRule(rule, `import { ref, computed } from 'vue';`);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.type).toBe('ImportDeclaration');
  });

  it('fires per-specifier on a mixed import (some auto-imported, some not)', () => {
    const reports = runRule(rule, `import { ref, SomeWidget } from 'vue';`);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.type).toBe('ImportSpecifier');
    expect(reports[0]!.message).toContain('auto-imported');
  });

  it('fires per-specifier for each auto-imported symbol in a mixed import', () => {
    const reports = runRule(
      rule,
      `import { ref, computed, SomeWidget } from 'vue';`,
    );
    expect(reports).toHaveLength(2);
    expect(reports.every((r) => r.type === 'ImportSpecifier')).toBe(true);
  });

  it('does NOT fire on import from unrelated source', () => {
    const reports = runRule(rule, `import { ref } from 'lodash';`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on default import', () => {
    const reports = runRule(rule, `import Vue from 'vue';`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on namespace import', () => {
    const reports = runRule(rule, `import * as Vue from 'vue';`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on type-only import', () => {
    const reports = runRule(rule, `import type { Ref } from 'vue';`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on type-only import from vue', () => {
    const reports = runRule(rule, `import { type Ref } from 'vue';`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on import of non-auto-imported symbol', () => {
    const reports = runRule(rule, `import { foo } from 'vue';`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on empty named imports', () => {
    const reports = runRule(rule, `import Vue from 'vue';`);
    expect(reports).toEqual([]);
  });
});
