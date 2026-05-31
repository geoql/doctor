import { describe, expect, it } from 'vitest';
import { clientOnlyForBrowserApis } from '../src/rules/hydration/clientOnly-for-browser-apis.js';
import { runRule } from './run-rule.js';

const rule = clientOnlyForBrowserApis;

describe('hydration/clientOnly-for-browser-apis', () => {
  it('fires on window.location at top level', () => {
    const reports = runRule(rule, `const loc = window.location;`);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('import.meta.client');
  });

  it('fires on document.title at top level', () => {
    const reports = runRule(rule, `const t = document.title;`);
    expect(reports).toHaveLength(1);
  });

  it('fires on navigator.userAgent at top level', () => {
    const reports = runRule(rule, `const ua = navigator.userAgent;`);
    expect(reports).toHaveLength(1);
  });

  it('fires on localStorage at top level', () => {
    const reports = runRule(rule, `const x = localStorage.getItem('k');`);
    expect(reports).toHaveLength(1);
  });

  it('fires on sessionStorage at top level', () => {
    const reports = runRule(rule, `const x = sessionStorage.getItem('k');`);
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire inside import.meta.client guard', () => {
    const reports = runRule(
      rule,
      `if (import.meta.client) { const loc = window.location; }`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire inside process.client guard', () => {
    const reports = runRule(
      rule,
      `if (process.client) { const loc = window.location; }`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire inside onMounted', () => {
    const reports = runRule(
      rule,
      `onMounted(() => { const loc = window.location; });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on unrelated member expressions', () => {
    const reports = runRule(rule, `const x = foo.bar;`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on window inside a regular function', () => {
    const reports = runRule(
      rule,
      `function getLoc() { return window.location; }`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on window inside import.meta.client guard at depth', () => {
    const reports = runRule(
      rule,
      `if (import.meta.client) { function getLoc() { return window.location; } }`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on window inside async function', () => {
    const reports = runRule(
      rule,
      `async function getLoc() { return window.location; }`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on window inside FunctionExpression callback', () => {
    const reports = runRule(
      rule,
      `onMounted(function() { const loc = window.location; });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on window inside function declaration', () => {
    const reports = runRule(
      rule,
      `function getLoc() { return window.location; }`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on window inside process.client guard at depth', () => {
    const reports = runRule(
      rule,
      `if (process.client) { function getLoc() { return window.location; } }`,
    );
    expect(reports).toEqual([]);
  });
});
