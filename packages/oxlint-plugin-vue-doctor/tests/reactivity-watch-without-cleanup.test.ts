import { describe, expect, it } from 'vitest';
import { watchWithoutCleanup } from '../src/rules/reactivity/watch-without-cleanup.js';
import { runRule } from './run-rule.js';

const rule = watchWithoutCleanup;

describe('reactivity/watch-without-cleanup', () => {
  it('fires when a watch callback adds an event listener without cleanup', () => {
    const reports = runRule(
      rule,
      `watch(src, () => { window.addEventListener('resize', onResize); });`,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('cleanup');
    expect(reports[0]!.message).toContain('vuejs.org');
  });

  it('fires when a watch callback registers setInterval without cleanup', () => {
    const reports = runRule(
      rule,
      `watch(src, () => { setInterval(tick, 1000); });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires when a watch callback registers setTimeout without cleanup', () => {
    const reports = runRule(
      rule,
      `watch(src, () => { setTimeout(tick, 1000); });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires for new ResizeObserver without cleanup', () => {
    const reports = runRule(
      rule,
      `watch(src, () => { new ResizeObserver(cb); });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires for new IntersectionObserver without cleanup', () => {
    const reports = runRule(
      rule,
      `watch(src, () => { new IntersectionObserver(cb); });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires for new MutationObserver without cleanup', () => {
    const reports = runRule(
      rule,
      `watch(src, () => { new MutationObserver(cb); });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires for watchEffect that registers a listener without onCleanup', () => {
    const reports = runRule(
      rule,
      `watchEffect(() => { window.addEventListener('scroll', h); });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires for a function-expression watch callback without cleanup', () => {
    const reports = runRule(
      rule,
      `watch(src, function () { window.addEventListener('resize', h); });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires when the callback returns a non-function value', () => {
    const reports = runRule(
      rule,
      `watch(src, () => { setInterval(tick, 1); return 42; });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires when the callback has a bare return', () => {
    const reports = runRule(
      rule,
      `watch(src, () => { setInterval(tick, 1); return; });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire when the watch callback returns an arrow cleanup', () => {
    const reports = runRule(
      rule,
      `watch(src, () => { window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire when the watch callback returns a function-expression cleanup', () => {
    const reports = runRule(
      rule,
      `watch(src, () => { setInterval(tick, 1); return function () { clearInterval(); }; });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire when watchEffect calls onCleanup', () => {
    const reports = runRule(
      rule,
      `watchEffect(() => { setInterval(tick, 1); onCleanup(() => {}); });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire when watchEffect calls onWatcherCleanup', () => {
    const reports = runRule(
      rule,
      `watchEffect(() => { window.addEventListener('scroll', h); onWatcherCleanup(() => {}); });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a watch callback with no side effects', () => {
    const reports = runRule(
      rule,
      `watch(src, () => { count.value = count.value + 1; });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire when watch has no callback argument', () => {
    const reports = runRule(rule, `watch(src);`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire when watchEffect has no argument', () => {
    const reports = runRule(rule, `watchEffect();`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire when the watch callback is an external identifier', () => {
    const reports = runRule(rule, `watch(src, handler);`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire for computed-member or curried calls inside the callback', () => {
    const reports = runRule(
      rule,
      `watch(src, () => { el[key](); make()(); make(); });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire for non-observer or dynamically-constructed new expressions', () => {
    const reports = runRule(
      rule,
      `watch(src, () => { new Foo(); new (make())(); });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a member call named watch', () => {
    const reports = runRule(
      rule,
      `obj.watch(src, () => { setInterval(tick, 1); });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire for a NewExpression outside any watch', () => {
    const reports = runRule(rule, `const o = new ResizeObserver(cb);`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire for a ReturnStatement outside any watch', () => {
    const reports = runRule(rule, `function foo() { return () => {}; }`);
    expect(reports).toEqual([]);
  });

  it('handles nested watches independently', () => {
    const reports = runRule(
      rule,
      `watch(a, () => { window.addEventListener('resize', h); watch(b, () => { setInterval(tick, 1); }); return () => window.removeEventListener('resize', h); });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does NOT treat onCleanup as cleanup for plain watch', () => {
    const reports = runRule(
      rule,
      `watch(src, () => { window.addEventListener('resize', h); onCleanup(() => {}); });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does NOT treat onWatcherCleanup as cleanup for plain watch', () => {
    const reports = runRule(
      rule,
      `watch(src, () => { window.addEventListener('resize', h); onWatcherCleanup(() => {}); });`,
    );
    expect(reports).toHaveLength(1);
  });
});
