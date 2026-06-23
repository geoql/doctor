import { describe, expect, it } from 'vitest';
import { preferStableEmptyFallback } from '../src/rules/vue/performance/prefer-stable-empty-fallback.js';
import { runRule } from './run-rule.js';

const rule = preferStableEmptyFallback;

describe('performance/prefer-stable-empty-fallback', () => {
  it('fires on computed(() => x.value ?? []) (concise body)', () => {
    const reports = runRule(
      rule,
      `const c = computed(() => items.value ?? []);`,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('module-scope');
  });

  it('fires on computed(() => x.value || []) with ||', () => {
    const reports = runRule(
      rule,
      `const c = computed(() => items.value || []);`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires on a fresh empty object fallback', () => {
    const reports = runRule(rule, `const c = computed(() => cfg.value ?? {});`);
    expect(reports).toHaveLength(1);
  });

  it('fires on a block-body return with ?? []', () => {
    const reports = runRule(
      rule,
      `const c = computed(() => { return items.value ?? []; });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires on a ternary whose branch is a fresh empty literal', () => {
    const reports = runRule(
      rule,
      `const c = computed(() => ok.value ? items.value : []);`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire when the fallback is a stable EMPTY constant', () => {
    const reports = runRule(
      rule,
      `const c = computed(() => items.value ?? EMPTY);`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a non-empty array fallback', () => {
    const reports = runRule(
      rule,
      `const c = computed(() => items.value ?? [1, 2]);`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a && logical (not a nullish/or fallback)', () => {
    const reports = runRule(rule, `const c = computed(() => ok.value && []);`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a plain getter with no fallback', () => {
    const reports = runRule(rule, `const c = computed(() => items.value);`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a non-computed call', () => {
    const reports = runRule(rule, `const c = ref(() => items.value ?? []);`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire when computed has a non-function first arg', () => {
    const reports = runRule(rule, `const c = computed(getter);`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a member-expression callee named computed', () => {
    const reports = runRule(
      rule,
      `const c = vue.computed(() => items.value ?? []);`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a block-body getter with no return statement', () => {
    const reports = runRule(
      rule,
      `const c = computed(() => { doSomething(); });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a writable computed object arg (get/set form)', () => {
    const reports = runRule(
      rule,
      `const c = computed({ get: () => items.value ?? [], set: () => {} });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire when block-body returns nothing (bare return)', () => {
    const reports = runRule(rule, `const c = computed(() => { return; });`);
    expect(reports).toEqual([]);
  });
});
