import { describe, expect, it } from 'vitest';
import { noNonNullAssertionOnRefValue } from '../src/rules/vue/ai-slop/no-non-null-assertion-on-ref-value.js';
import { runRule } from './run-rule.js';

const rule = noNonNullAssertionOnRefValue;

describe('no-non-null-assertion-on-ref-value', () => {
  it('fires on ref().value! standalone', () => {
    const reports = runRule(rule, `const r = ref(0);\nconst x = r.value!;`);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('guard');
  });

  it('fires on member access r.value!.foo', () => {
    const reports = runRule(
      rule,
      `const r = ref({});\nconst x = r.value!.foo;`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires for shallowRef, computed, useTemplateRef sources', () => {
    const src = `const a = shallowRef(0);\nconst b = computed(() => 1);\nconst c = useTemplateRef('el');\nconst x = a.value!;\nconst y = b.value!;\nconst z = c.value!;`;
    expect(runRule(rule, src)).toHaveLength(3);
  });

  it('does NOT fire on ! applied to non-ref receivers', () => {
    const reports = runRule(
      rule,
      `const x = document.getElementById('a')!;\nconst y = arr![0];`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on .value without ! (optional chaining)', () => {
    const reports = runRule(
      rule,
      `const r = ref(null);\nconst x = r.value?.name;`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on .value! of an identifier not bound to a ref factory', () => {
    const reports = runRule(
      rule,
      `const obj = makeThing();\nconst x = obj.value!;`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire when the init callee is a member expression', () => {
    const reports = runRule(rule, `const r = foo.bar();\nconst x = r.value!;`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire when the receiver of .value! is not an identifier', () => {
    const reports = runRule(rule, `const x = getRef().value!;`);
    expect(reports).toEqual([]);
  });

  it('surfaces the official Vue typescript docs URL', () => {
    const reports = runRule(rule, `const r = ref(0);\nconst x = r.value!;`);
    expect(reports[0]!.message).toContain('vuejs.org');
  });
});
