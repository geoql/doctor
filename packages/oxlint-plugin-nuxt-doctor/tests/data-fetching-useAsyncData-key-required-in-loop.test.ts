import { describe, expect, it } from 'vitest';
import { useAsyncDataKeyRequiredInLoop } from '../src/rules/data-fetching/useAsyncData-key-required-in-loop.js';
import { runRule } from './run-rule.js';

const rule = useAsyncDataKeyRequiredInLoop;

describe('data-fetching/useAsyncData-key-required-in-loop', () => {
  it('fires on useAsyncData without key inside a for-of loop', () => {
    const reports = runRule(
      rule,
      `for (const id of ids) { useAsyncData(() => $fetch(id)); }`,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('useAsyncData');
  });

  it('fires on useFetch without key inside a for loop', () => {
    const reports = runRule(
      rule,
      `for (let i = 0; i < ids.length; i++) { useFetch('/api/' + ids[i]); }`,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('useFetch');
  });

  it('fires on useAsyncData without key inside a while loop', () => {
    const reports = runRule(
      rule,
      `while (true) { useAsyncData(() => data()); }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires on useAsyncData without key inside a for-in loop', () => {
    const reports = runRule(
      rule,
      `for (const k in obj) { useAsyncData(() => obj[k]); }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires on useFetch without key inside a .map() callback', () => {
    const reports = runRule(rule, `ids.map((id) => useFetch('/api/' + id));`);
    expect(reports).toHaveLength(1);
  });

  it('fires on useAsyncData without key inside a .map() callback', () => {
    const reports = runRule(
      rule,
      `ids.map((id) => useAsyncData(() => $fetch(id)));`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire on useAsyncData with plain string literal key inside a loop', () => {
    const reports = runRule(
      rule,
      `for (const id of ids) { useAsyncData('user-key', () => $fetch(id)); }`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on useAsyncData without key outside a loop', () => {
    const reports = runRule(rule, `useAsyncData(() => $fetch('/api'));`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a regular function call inside a loop', () => {
    const reports = runRule(rule, `for (const id of ids) { console.log(id); }`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on useAsyncData with computed key inside loop', () => {
    const reports = runRule(
      rule,
      `for (const id of ids) { useAsyncData('user-' + id, () => $fetch(id)); }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire on MemberExpression callee inside loop', () => {
    const reports = runRule(
      rule,
      `for (const id of ids) { api.useAsyncData(() => $fetch(id)); }`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on useAsyncData inside .filter().map() chain', () => {
    const reports = runRule(
      rule,
      `ids.filter(Boolean).map((id) => useAsyncData(() => $fetch(id));`,
    );
    expect(reports).toHaveLength(0);
  });

  it('does NOT fire on a call whose callee is neither identifier nor member', () => {
    const reports = runRule(rule, `(function () {})();`);
    expect(reports).toEqual([]);
  });

  it('does NOT treat a computed ["map"] member call as a map loop', () => {
    const reports = runRule(rule, `obj['map'](() => useFetch());`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on useFetch called with no arguments inside a loop', () => {
    const reports = runRule(rule, `for (const id of ids) { useFetch(); }`);
    expect(reports).toEqual([]);
  });
});
