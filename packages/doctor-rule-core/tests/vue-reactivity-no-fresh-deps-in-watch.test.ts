import { describe, expect, it } from 'vitest';
import { noFreshDepsInWatch } from '../src/rules/vue/reactivity/no-fresh-deps-in-watch.js';
import { runRule } from './run-rule.js';

const rule = noFreshDepsInWatch;

describe('reactivity/no-fresh-deps-in-watch', () => {
  it('fires on a getter returning a fresh array literal (concise body)', () => {
    const reports = runRule(rule, `watch(() => [a.value, b.value], cb);`);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('Object.is');
  });

  it('fires on a getter returning a fresh object literal (concise body)', () => {
    const reports = runRule(rule, `watch(() => ({ a: a.value }), cb);`);
    expect(reports).toHaveLength(1);
  });

  it('fires on a block-body getter that returns a fresh array', () => {
    const reports = runRule(
      rule,
      `watch(() => { return [a.value, b.value]; }, cb);`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires on a function-expression getter returning a literal', () => {
    const reports = runRule(
      rule,
      `watch(function () { return { x: 1 }; }, cb);`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire on the multi-source array form watch([a, b], cb)', () => {
    const reports = runRule(rule, `watch([a, b], cb);`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a getter returning a single ref value', () => {
    const reports = runRule(rule, `watch(() => a.value, cb);`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on watching a ref directly', () => {
    const reports = runRule(rule, `watch(count, cb);`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire when an inner function returns a literal but the getter does not', () => {
    const reports = runRule(
      rule,
      `watch(() => { const make = () => [1, 2]; return a.value; }, cb);`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on watchEffect (no source getter)', () => {
    const reports = runRule(rule, `watchEffect(() => { use(a.value); });`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a non-watch call', () => {
    const reports = runRule(rule, `computed(() => [a.value, b.value]);`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire when watch has a non-function first arg', () => {
    const reports = runRule(rule, `watch();`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a member-expression callee named watch', () => {
    const reports = runRule(rule, `obj.watch(() => [a.value], cb);`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a block-body getter with no return', () => {
    const reports = runRule(rule, `watch(() => { doSomething(); }, cb);`);
    expect(reports).toEqual([]);
  });
});
