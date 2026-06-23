import { describe, expect, it } from 'vitest';
import { preferModuleScopeStaticValue } from '../src/rules/vue/performance/prefer-module-scope-static-value.js';
import { runRule } from './run-rule.js';

const rule = preferModuleScopeStaticValue;

describe('performance/prefer-module-scope-static-value', () => {
  it('fires on a static array literal declared inside a function', () => {
    const reports = runRule(
      rule,
      `function useOptions() { const OPTIONS = ['a', 'b', 'c']; return OPTIONS; }`,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('module scope');
  });

  it('fires on a static object literal declared inside an arrow function', () => {
    const reports = runRule(
      rule,
      `const setup = () => { const CFG = { a: 1, b: 2 }; return CFG; };`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires on a nested static array/object literal', () => {
    const reports = runRule(
      rule,
      `function f() { const X = [{ id: 1 }, { id: 2 }]; return X; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires on a static literal with unary-negative numbers', () => {
    const reports = runRule(
      rule,
      `function f() { const X = [-1, -2, 3]; return X; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire on a static literal at module scope', () => {
    const reports = runRule(rule, `const OPTIONS = ['a', 'b', 'c'];`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire when the array references identifiers (not static)', () => {
    const reports = runRule(
      rule,
      `function f() { const X = [a, b, c]; return X; }`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire when the object has a computed or call value', () => {
    const reports = runRule(
      rule,
      `function f() { const X = { a: compute(), b: 2 }; return X; }`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a single-element array (not worth hoisting)', () => {
    const reports = runRule(rule, `function f() { const X = [1]; return X; }`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on an empty array or empty object', () => {
    const reports = runRule(
      rule,
      `function f() { const A = []; const O = {}; return [A, O]; }`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a primitive value inside a function', () => {
    const reports = runRule(rule, `function f() { const N = 42; return N; }`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a declarator with no initializer', () => {
    const reports = runRule(rule, `function f() { let x; return x; }`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on an object with a computed key', () => {
    const reports = runRule(
      rule,
      `function f() { const X = { [k]: 1, b: 2 }; return X; }`,
    );
    expect(reports).toEqual([]);
  });

  it('fires once per offending declarator across nested functions', () => {
    const reports = runRule(
      rule,
      `function outer() { const A = [1, 2]; function inner() { const B = { x: 1 }; return B; } return [A, inner]; }`,
    );
    expect(reports).toHaveLength(2);
  });

  it('does NOT fire on a template literal with interpolation', () => {
    const reports = runRule(
      rule,
      'function f() { const X = [`a${b}`, `c`]; return X; }',
    );
    expect(reports).toEqual([]);
  });

  it('fires on an array of plain template literals (no interpolation)', () => {
    const reports = runRule(
      rule,
      'function f() { const X = [`a`, `b`]; return X; }',
    );
    expect(reports).toHaveLength(1);
  });

  it('fires inside a function expression scope', () => {
    const reports = runRule(
      rule,
      `const s = function () { const X = [1, 2, 3]; return X; };`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire on a sparse array literal (a hole is not a static value)', () => {
    const reports = runRule(
      rule,
      `function f() { const X = [1, , 3]; return X; }`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire when a nested value is an empty object (not static)', () => {
    const reports = runRule(
      rule,
      `function f() { const X = [{}, {}]; return X; }`,
    );
    expect(reports).toEqual([]);
  });
});
