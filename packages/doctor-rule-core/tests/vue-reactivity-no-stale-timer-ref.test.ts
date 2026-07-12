import { describe, expect, it } from 'vitest';
import { noStaleTimerRef } from '../src/rules/vue/reactivity/no-stale-timer-ref.js';
import { runRule } from './run-rule.js';

const rule = noStaleTimerRef;

describe('reactivity/no-stale-timer-ref', () => {
  it('fires when clearTimeout(ref.value) is not followed by a ref.value reset', () => {
    const reports = runRule(
      rule,
      `function hide() { clearTimeout(timer.value); }`,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('stale');
  });

  it('fires for clearInterval(ref.value) without reset', () => {
    const reports = runRule(
      rule,
      `function stop() { clearInterval(poll.value); }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does not fire when the ref is reset to null in the same function', () => {
    const reports = runRule(
      rule,
      `function hide() { clearTimeout(timer.value); timer.value = null; }`,
    );
    expect(reports).toHaveLength(0);
  });

  it('does not fire when the ref is reassigned to a new timer', () => {
    const reports = runRule(
      rule,
      `function restart() { clearTimeout(timer.value); timer.value = setTimeout(tick, 100); }`,
    );
    expect(reports).toHaveLength(0);
  });

  it('does not fire for clearTimeout on a plain identifier (not a ref)', () => {
    const reports = runRule(rule, `function hide() { clearTimeout(handle); }`);
    expect(reports).toHaveLength(0);
  });

  it('tracks separate refs independently', () => {
    const reports = runRule(
      rule,
      `function hide() { clearTimeout(showTimer.value); clearTimeout(hideTimer.value); hideTimer.value = null; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires at setup top level (outside any function)', () => {
    const reports = runRule(rule, `clearTimeout(timer.value);`);
    expect(reports).toHaveLength(1);
  });

  it('scopes assignment detection to the enclosing function', () => {
    const reports = runRule(
      rule,
      `function a() { clearTimeout(timer.value); }
       function b() { timer.value = null; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does not fire when clear target is not a .value member', () => {
    const reports = runRule(
      rule,
      `function hide() { clearTimeout(state.timerId); }`,
    );
    expect(reports).toHaveLength(0);
  });

  it('does not fire when the clear target object is not a ref identifier', () => {
    const reports = runRule(
      rule,
      `function hide() { clearTimeout(getTimer().value); }`,
    );
    expect(reports).toHaveLength(0);
  });

  it('does not clear pending state when assignment target is not a ref value', () => {
    const reports = runRule(
      rule,
      `function hide() { clearTimeout(timer.value); state.timer = null; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('reports nested timer clears exactly once', () => {
    const reports = runRule(
      rule,
      `function outer() { function inner() { clearTimeout(timer.value); } }`,
    );
    expect(reports).toHaveLength(1);
  });
});
