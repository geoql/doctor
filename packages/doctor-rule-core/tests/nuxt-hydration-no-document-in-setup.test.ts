import { describe, expect, it } from 'vitest';
import { noDocumentInSetup } from '../src/rules/nuxt/hydration/no-document-in-setup.js';
import { runRule } from './run-rule.js';

const rule = noDocumentInSetup;

describe('hydration/no-document-in-setup', () => {
  it('fires on document at top level', () => {
    const reports = runRule(rule, `const title = document.title;`);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.type).toBe('Identifier');
    expect(reports[0]!.message).toContain('document');
  });

  it('fires on window at top level', () => {
    const reports = runRule(rule, `const w = window;`);
    expect(reports).toHaveLength(1);
  });

  it('fires on navigator at top level', () => {
    const reports = runRule(rule, `const ua = navigator.userAgent;`);
    expect(reports).toHaveLength(1);
  });

  it('fires on localStorage at top level', () => {
    const reports = runRule(rule, `const x = localStorage.getItem('x');`);
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire on document inside onMounted', () => {
    const reports = runRule(
      rule,
      `onMounted(() => { const t = document.title; });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on window inside a regular function', () => {
    const reports = runRule(rule, `function foo() { return window.location; }`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on unrelated identifiers', () => {
    const reports = runRule(rule, `const x = 42;`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on navigator inside FunctionExpression', () => {
    const reports = runRule(
      rule,
      `function getUA() { return navigator.userAgent; }`,
    );
    expect(reports).toEqual([]);
  });

  it('fires on sessionStorage at top level', () => {
    const reports = runRule(rule, `const x = sessionStorage.getItem('k');`);
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire on document inside FunctionExpression callback', () => {
    const reports = runRule(
      rule,
      `onMounted(function() { const t = document.title; });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on document inside a nested arrow function', () => {
    const reports = runRule(
      rule,
      `const f = () => { const g = () => { const t = document.title; }; };`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on window inside a nested function expression', () => {
    const reports = runRule(
      rule,
      `const f = function () { const g = function () { return window; }; };`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on navigator inside a nested function declaration', () => {
    const reports = runRule(
      rule,
      `function outer() { function inner() { return navigator.userAgent; } }`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on `document:` interface property key', () => {
    const reports = runRule(
      rule,
      `interface BrowserContext { document: { title: string } }`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on `window:` type literal property key', () => {
    const reports = runRule(rule, `type T = { window: { location: string } }`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on `document` inside `if (import.meta.client) { ... }`', () => {
    const reports = runRule(
      rule,
      `if (import.meta.client) { const t = document.title; }`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on `window` inside nested block guarded by `import.meta.client`', () => {
    const reports = runRule(
      rule,
      `function foo() { if (import.meta.client) { function bar() { return window; } } }`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire with a compound guard mixing a non-meta .client member', () => {
    const reports = runRule(
      rule,
      `if (svc.client && import.meta.client) { const t = document.title; }`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire when import.meta.client sits inside a call-argument guard', () => {
    const reports = runRule(
      rule,
      `if (check(import.meta.client)) { const t = document.title; }`,
    );
    expect(reports).toEqual([]);
  });

  it('still fires when a compound guard does NOT include import.meta.client', () => {
    const reports = runRule(
      rule,
      `if (ready && other.flag) { const t = document.title; }`,
    );
    expect(reports).toHaveLength(1);
  });
});
