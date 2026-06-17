import { describe, expect, it } from 'vitest';
import { noFetchInSetup } from '../src/rules/nuxt/ai-slop/no-fetch-in-setup.js';
import { runRule } from './run-rule.js';

const rule = noFetchInSetup;

describe('ai-slop/no-fetch-in-setup', () => {
  it('fires on top-level await $fetch', () => {
    const reports = runRule(rule, `const data = await $fetch('/api/users');`);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('useFetch');
  });

  it('fires on top-level await fetch', () => {
    const reports = runRule(rule, `const data = await fetch('/api/users');`);
    expect(reports).toHaveLength(1);
  });

  it('fires on top-level bare $fetch call', () => {
    const reports = runRule(rule, `const data = $fetch('/api/users');`);
    expect(reports).toHaveLength(1);
  });

  it('fires on top-level bare fetch call', () => {
    const reports = runRule(rule, `const data = fetch('/api/users');`);
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire on $fetch inside onMounted callback', () => {
    const reports = runRule(
      rule,
      `onMounted(async () => { const d = await $fetch('/api'); });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on $fetch inside a regular function', () => {
    const reports = runRule(rule, `function load() { return $fetch('/api'); }`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on $fetch inside an arrow function', () => {
    const reports = runRule(rule, `const load = () => $fetch('/api');`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on unrelated function calls', () => {
    const reports = runRule(rule, `const x = console.log('hello');`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on method-call style fetch', () => {
    const reports = runRule(rule, `const d = api.fetch('/api');`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on FunctionExpression at top level', () => {
    const reports = runRule(
      rule,
      `const fn = function() { return $fetch('/api'); };`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on $fetch inside FunctionExpression', () => {
    const reports = runRule(
      rule,
      `onMounted(function() { return $fetch('/api'); });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on $fetch inside FunctionDeclaration', () => {
    const reports = runRule(rule, `function load() { return $fetch('/api'); }`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on $fetch inside nested arrow in onMounted', () => {
    const reports = runRule(
      rule,
      `onMounted(() => { const fn = () => $fetch('/api'); });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on $fetch inside nested function in onMounted', () => {
    const reports = runRule(
      rule,
      `onMounted(() => { function inner() { return $fetch('/api'); } });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on await $fetch inside FunctionExpression at top level', () => {
    const reports = runRule(
      rule,
      `const fn = async function() { return await $fetch('/api'); };`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on MemberExpression callee for fetch', () => {
    const reports = runRule(rule, `const d = obj.fetch('/api');`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on $fetch inside async arrow function', () => {
    const reports = runRule(
      rule,
      `const load = async () => await $fetch('/api');`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on top-level await of a non-call expression', () => {
    const reports = runRule(rule, `const x = await something;`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on top-level await of a non-fetch call', () => {
    const reports = runRule(rule, `const x = await loadData();`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on $fetch inside a nested FunctionExpression', () => {
    const reports = runRule(
      rule,
      `const f = function () { const g = function () { return $fetch('/api'); }; };`,
    );
    expect(reports).toEqual([]);
  });
});
