import { describe, expect, it } from 'vitest';
import { definePropsTyped } from '../src/rules/vue/composition/defineProps-typed.js';
import { runRule } from './run-rule.js';

const rule = definePropsTyped;

describe('composition/defineProps-typed', () => {
  it('fires on defineProps with a runtime object argument', () => {
    const reports = runRule(
      rule,
      `defineProps({ name: String, age: { type: Number, required: true } });`,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('generic');
    expect(reports[0]!.message).toContain('vuejs.org');
  });

  it('fires on a minimal runtime object argument', () => {
    const reports = runRule(rule, `defineProps({ name: String });`);
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire on the type-based generic form', () => {
    const reports = runRule(rule, `defineProps<{ name: string }>();`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire when defineProps has no arguments', () => {
    const reports = runRule(rule, `defineProps();`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire when the argument is a variable reference', () => {
    const reports = runRule(rule, `defineProps(propsObject);`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a different macro that takes an object', () => {
    const reports = runRule(rule, `defineEmits({ change: null });`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a member call named defineProps', () => {
    const reports = runRule(rule, `obj.defineProps({ name: String });`);
    expect(reports).toEqual([]);
  });
});
