import { describe, expect, it } from 'vitest';
import { noPropCallbackInSetup } from '../src/rules/vue/composition/no-prop-callback-in-setup.js';
import { runRule } from './run-rule.js';

const rule = noPropCallbackInSetup;

describe('composition/no-prop-callback-in-setup', () => {
  it('fires when a props callback is invoked at setup top level', () => {
    const reports = runRule(
      rule,
      `const props = defineProps<{ onSelect: (v: string) => void }>();
       props.onSelect('init');`,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('setup');
  });

  it('fires when a props callback is invoked inside a computed getter', () => {
    const reports = runRule(
      rule,
      `const props = defineProps<{ onChange: (v: number) => void }>();
       const doubled = computed(() => { props.onChange(2); return 2; });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does not fire when the callback is invoked inside an event handler function', () => {
    const reports = runRule(
      rule,
      `const props = defineProps<{ onSelect: (v: string) => void }>();
       function handleClick() { props.onSelect('clicked'); }`,
    );
    expect(reports).toHaveLength(0);
  });

  it('does not fire inside watch callbacks', () => {
    const reports = runRule(
      rule,
      `const props = defineProps<{ onChange: (v: number) => void }>();
       watch(source, () => { props.onChange(1); });`,
    );
    expect(reports).toHaveLength(0);
  });

  it('does not fire inside onMounted', () => {
    const reports = runRule(
      rule,
      `const props = defineProps<{ onReady: () => void }>();
       onMounted(() => { props.onReady(); });`,
    );
    expect(reports).toHaveLength(0);
  });

  it('does not fire for non-call member reads of props', () => {
    const reports = runRule(
      rule,
      `const props = defineProps<{ label: string }>();
       const text = props.label;`,
    );
    expect(reports).toHaveLength(0);
  });

  it('does not fire for computed member access on props', () => {
    const reports = runRule(
      rule,
      `const props = defineProps<{ onReady: () => void }>();
       props['onReady']();`,
    );
    expect(reports).toHaveLength(0);
  });

  it('does not fire for callbacks on non-props objects', () => {
    const reports = runRule(
      rule,
      `const props = defineProps<{ onReady: () => void }>();
       other.onReady();`,
    );
    expect(reports).toHaveLength(0);
  });

  it('does not fire for lower-case callback-like property names', () => {
    const reports = runRule(
      rule,
      `const props = defineProps<{ onchange: () => void }>();
       props.onchange();`,
    );
    expect(reports).toHaveLength(0);
  });

  it('does not fire when there is no defineProps in the file', () => {
    const reports = runRule(rule, `props.onSelect('x');`);
    expect(reports).toHaveLength(0);
  });

  it('respects a custom props variable name from defineProps', () => {
    const reports = runRule(
      rule,
      `const p = defineProps<{ onGo: () => void }>();
       p.onGo();`,
    );
    expect(reports).toHaveLength(1);
  });

  it('respects withDefaults-wrapped defineProps', () => {
    const reports = runRule(
      rule,
      `const props = withDefaults(defineProps<{ onReady?: () => void }>(), { onReady: () => {} });
       props.onReady();`,
    );
    expect(reports).toHaveLength(1);
  });

  it('ignores destructured defineProps because there is no props object callback access', () => {
    const reports = runRule(
      rule,
      `const { onReady } = defineProps<{ onReady: () => void }>();
       onReady();`,
    );
    expect(reports).toHaveLength(0);
  });

  it('ignores non-computed function callbacks even when passed to another call', () => {
    const reports = runRule(
      rule,
      `const props = defineProps<{ onReady: () => void }>();
       queueMicrotask(() => props.onReady());`,
    );
    expect(reports).toHaveLength(0);
  });

  it('fires inside watchEffect only for computed-like render paths, not effect callbacks', () => {
    const reports = runRule(
      rule,
      `const props = defineProps<{ onTick: () => void }>();
       watchEffect(() => { props.onTick(); });`,
    );
    expect(reports).toHaveLength(0);
  });
  it('does not treat functions with method-call parents as computed getters', () => {
    const reports = runRule(
      rule,
      `const props = defineProps<{ onReady: () => void }>();
       items.forEach(() => { props.onReady(); });`,
    );
    expect(reports).toHaveLength(0);
  });

  it('does not fire for callbacks on nested props members', () => {
    const reports = runRule(
      rule,
      `const props = defineProps<{ nested: { onReady: () => void } }>();
       props.nested.onReady();`,
    );
    expect(reports).toHaveLength(0);
  });
});
