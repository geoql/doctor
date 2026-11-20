import { describe, expect, it } from 'vite-plus/test';
import { useAsyncDataKeyRequiredInLoop } from '../src/rules/nuxt/data-fetching/useAsyncData-key-required-in-loop.js';
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

  it('fires on useAsyncData with a constant string key inside a loop', () => {
    const reports = runRule(
      rule,
      `for (const id of ids) { useAsyncData('user-key', () => $fetch(id)); }`,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('loop variable');
  });

  it.each([
    [
      'a template literal with no expressions',
      'ids.map((id) => useAsyncData(`users`, () => $fetch(id)));',
    ],
    [
      'a const declared outside the loop',
      `const KEY = 'k'; for (const id of ids) { useAsyncData(KEY, () => $fetch(id)); }`,
    ],
    [
      'a non-computed member of an outer object',
      `for (const id of ids) { useAsyncData(KEYS.main, () => $fetch(id)); }`,
    ],
    [
      'a constant declared inside the loop body',
      `for (const id of ids) { const k = 'x'; useAsyncData(k, () => $fetch(id)); }`,
    ],
    [
      'a key that only uses the outer loop variable of a nested loop',
      'for (const user of users) { ids.map((id) => useAsyncData(`u-${user.id}`, () => $fetch(id))); }',
    ],
    [
      'a constant key inside a while loop',
      `while (more) { useAsyncData('page', () => next()); }`,
    ],
  ])('fires on useAsyncData whose key is %s', (_label, code) => {
    expect(runRule(rule, code)).toHaveLength(1);
  });

  it.each([
    [
      'a call that takes the loop variable',
      `for (const id of ids) { useAsyncData(keyFor(id), () => $fetch(id)); }`,
    ],
    [
      'a member of the loop variable',
      `for (const user of users) { useAsyncData(user.id, () => $fetch(user.id)); }`,
    ],
    [
      'a computed member indexed by the loop variable',
      `for (const id of ids) { useAsyncData(KEYS[id], () => $fetch(id)); }`,
    ],
    [
      'a destructured callback param',
      'rows.map(({ id }) => useAsyncData(`u-${id}`, () => $fetch(id)));',
    ],
    [
      'an array-destructured callback param with a hole',
      'rows.map(([, id]) => useAsyncData(`u-${id}`, () => $fetch(id)));',
    ],
    [
      'a defaulted callback param',
      'ids.map((id = 0) => useAsyncData(`u-${id}`, () => $fetch(id)));',
    ],
    [
      'a rest callback param',
      'ids.map((...args) => useAsyncData(`u-${args[0]}`, () => $fetch(args)));',
    ],
    [
      'an object-rest callback param',
      'rows.map(({ ...row }) => useAsyncData(`u-${row.id}`, () => $fetch(row)));',
    ],
    [
      'a loop variable assigned without a declaration',
      'for (id of ids) { useAsyncData(`u-${id}`, () => $fetch(id)); }',
    ],
    [
      'a const derived from the loop variable inside the body',
      'for (const id of ids) { const k = `u-${id}`; useAsyncData(k, () => $fetch(id)); }',
    ],
    [
      'an outer counter inside a while loop',
      'while (page < last) { const k = `p-${page}`; useAsyncData(k, () => next()); page++; }',
    ],
    [
      'a member-expression loop target',
      'for (state.id of ids) { useAsyncData(`u-${state.id}`, () => $fetch(state.id)); }',
    ],
    [
      'an expression shape the rule does not inspect',
      `for (const id of ids) { useAsyncData(ok ? id : 'x', () => $fetch(id)); }`,
    ],
  ])('does NOT fire when the key is %s', (_label, code) => {
    expect(runRule(rule, code)).toEqual([]);
  });

  it('keeps accepting useFetch with a string URL inside a loop (useFetch is unchanged)', () => {
    expect(
      runRule(rule, `for (const id of ids) { useFetch('/api/items'); }`),
    ).toEqual([]);
  });

  it('does NOT fire on .map() with a named callback', () => {
    expect(runRule(rule, `ids.map(loadOne);`)).toEqual([]);
  });

  it('does NOT fire on useAsyncData without key outside a loop', () => {
    const reports = runRule(rule, `useAsyncData(() => $fetch('/api'));`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a regular function call inside a loop', () => {
    const reports = runRule(rule, `for (const id of ids) { console.log(id); }`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on useAsyncData with a key built from the loop variable', () => {
    const reports = runRule(
      rule,
      `for (const id of ids) { useAsyncData('user-' + id, () => $fetch(id)); }`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on useAsyncData with a template-literal key inside .map()', () => {
    const reports = runRule(
      rule,
      'ids.map((id) => useAsyncData(`user-${id}`, function () { return $fetch(id); }));',
    );
    expect(reports).toEqual([]);
  });

  it('fires on keyless useAsyncData with an options object inside a loop', () => {
    const reports = runRule(
      rule,
      `for (const id of ids) { useAsyncData(() => $fetch(id), { lazy: true }); }`,
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
