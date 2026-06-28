import { describe, expect, it } from 'vitest';
import { noDestructurePropsWithoutToRefs } from '../src/rules/vue/ai-slop/no-destructure-props-without-toRefs.js';
import { runRule } from './run-rule.js';

const rule = noDestructurePropsWithoutToRefs;

describe('no-destructure-props-without-toRefs', () => {
  it('fires when destructuring defineProps() directly', () => {
    const reports = runRule(rule, `const { a, b } = defineProps();`);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('toRefs');
  });

  it('fires when destructuring withDefaults(defineProps(...))', () => {
    const reports = runRule(
      rule,
      `const { a } = withDefaults(defineProps(), { a: 1 });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires when destructuring an identifier bound to defineProps()', () => {
    const reports = runRule(
      rule,
      `const props = defineProps();\nconst { a, b } = props;`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires on Options API setup(props) destructure', () => {
    const reports = runRule(
      rule,
      `export default { setup(props) { const { a } = props; return {}; } };`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire when toRefs wraps the destructure', () => {
    const reports = runRule(rule, `const { a, b } = toRefs(defineProps());`);
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

  it('does NOT register a destructured (non-Identifier) setup param', () => {
    const reports = runRule(
      rule,
      `export default { setup({ a }) { const { b } = a; return {}; } };`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on non-destructure props access', () => {
    const reports = runRule(
      rule,
      `const props = defineProps();\nconst a = props.a;`,
    );
    expect(reports).toEqual([]);
  });

  it('surfaces the official Vue docs URL', () => {
    const reports = runRule(rule, `const { a } = defineProps();`);
    expect(reports[0]!.message).toContain('vuejs.org');
  });

  it('does NOT fire when destructuring props inside a computed() getter', () => {
    // Getter re-runs and re-reads props.* fresh, so reactivity is preserved.
    const reports = runRule(
      rule,
      `const props = defineProps();\nconst delegated = computed(() => {\n  const { class: _, ...rest } = props;\n  return rest;\n});`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire when destructuring props inside a watch callback', () => {
    const reports = runRule(
      rule,
      `const props = defineProps();\nwatch(foo, () => {\n  const { a } = props;\n});`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire when destructuring props inside a plain handler function', () => {
    const reports = runRule(
      rule,
      `const props = defineProps();\nfunction onClick() {\n  const { a } = props;\n}`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire when destructuring defineProps() result inside a nested function', () => {
    const reports = runRule(
      rule,
      `const dp = computed(() => {\n  const { a } = defineProps();\n  return a;\n});`,
    );
    expect(reports).toEqual([]);
  });

  it('still fires on a nested computed inside Options API setup', () => {
    // Destructure directly in setup body = one-time snapshot (BAD); nested in a computed = reactive (OK).
    const bad = runRule(
      rule,
      `export default { setup(props) { const { a } = props; return {}; } };`,
    );
    expect(bad).toHaveLength(1);
    const ok = runRule(
      rule,
      `export default { setup(props) { const c = computed(() => { const { a } = props; return a; }); return { c }; } };`,
    );
    expect(ok).toEqual([]);
  });
});
