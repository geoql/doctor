import { describe, expect, it } from 'vitest';
import { noDestructureReactiveWithoutToRefs } from '../src/rules/vue/ai-slop/no-destructure-reactive-without-toRefs.js';
import { runRule } from './run-rule.js';

const rule = noDestructureReactiveWithoutToRefs;

describe('no-destructure-reactive-without-toRefs', () => {
  it('fires when destructuring reactive() directly', () => {
    const reports = runRule(rule, `const { a, b } = reactive({ a: 1, b: 2 });`);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('toRefs');
  });

  it('fires when destructuring shallowReactive()', () => {
    const reports = runRule(rule, `const { a } = shallowReactive({ a: 1 });`);
    expect(reports).toHaveLength(1);
  });

  it('fires when destructuring readonly(reactive(...))', () => {
    const reports = runRule(
      rule,
      `const { a } = readonly(reactive({ a: 1 }));`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires when destructuring an identifier bound to reactive()', () => {
    const reports = runRule(
      rule,
      `const state = reactive({ a: 1 });\nconst { a } = state;`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire when toRefs wraps the destructure', () => {
    const reports = runRule(rule, `const { a } = toRefs(reactive({ a: 1 }));`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on toRef single-property access', () => {
    const reports = runRule(
      rule,
      `const state = reactive({ a: 1 });\nconst a = toRef(state, 'a');`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on unrelated destructures', () => {
    const reports = runRule(rule, `const { a } = useFoo();`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire when the init callee is a member expression', () => {
    const reports = runRule(rule, `const { a } = foo.bar();`);
    expect(reports).toEqual([]);
  });

  it('surfaces the official Vue reactivity docs URL', () => {
    const reports = runRule(rule, `const { a } = reactive({ a: 1 });`);
    expect(reports[0]!.message).toContain(
      'reactivity-fundamentals.html#destructuring-reactive-state',
    );
  });
});
