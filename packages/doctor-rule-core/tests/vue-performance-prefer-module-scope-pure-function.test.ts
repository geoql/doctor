import { describe, expect, it } from 'vitest';
import { preferModuleScopePureFunction } from '../src/rules/vue/performance/prefer-module-scope-pure-function.js';
import { runRule } from './run-rule.js';

const rule = preferModuleScopePureFunction;

describe('performance/prefer-module-scope-pure-function', () => {
  it('fires on a pure const-arrow helper inside a function (only params + globals)', () => {
    const reports = runRule(
      rule,
      `function useThing() { const double = (n) => n * 2; return double; }`,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('module scope');
  });

  it('fires on a pure nested function declaration', () => {
    const reports = runRule(
      rule,
      `function setup() { function fmt(d) { return d.toFixed(2); } return fmt; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires on a helper that uses only an imported binding', () => {
    const reports = runRule(
      rule,
      `import { clamp } from 'lodash-es'; function s() { const g = (n) => clamp(n, 0, 1); return g; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires on a helper that uses only globals (Math/JSON)', () => {
    const reports = runRule(
      rule,
      `function s() { const r = (a, b) => Math.max(a, b); return r; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire when the helper captures a reactive local (ref)', () => {
    const reports = runRule(
      rule,
      `function s() { const count = ref(0); const inc = () => count.value++; return inc; }`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire when the helper captures an enclosing parameter', () => {
    const reports = runRule(
      rule,
      `function s(base) { const add = (n) => n + base; return add; }`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a module-scope helper (already hoisted)', () => {
    const reports = runRule(rule, `const double = (n) => n * 2;`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a module-scope function declaration', () => {
    const reports = runRule(rule, `function fmt(d) { return d.toFixed(2); }`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire when the helper references another enclosing local helper', () => {
    const reports = runRule(
      rule,
      `function s() { const a = 5; const f = (n) => n + a; return f; }`,
    );
    expect(reports).toEqual([]);
  });

  it('does not treat member-property names as free variables', () => {
    const reports = runRule(
      rule,
      `function s() { const g = (o) => o.value.nested; return g; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does not treat object-literal keys as free variables', () => {
    const reports = runRule(
      rule,
      `function s() { const g = (n) => ({ count: n, total: n }); return g; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('handles destructured params (object/array/rest/default) as bound', () => {
    const reports = runRule(
      rule,
      `function s() { const g = ({ a }, [b], ...rest) => a + b + rest.length; return g; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire on a non-const function binding (let)', () => {
    const reports = runRule(
      rule,
      `function s() { let g = (n) => n * 2; return g; }`,
    );
    expect(reports).toEqual([]);
  });

  it('counts an imported default specifier as in-scope', () => {
    const reports = runRule(
      rule,
      `import dayjs from 'dayjs'; function s() { const g = (d) => dayjs(d); return g; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('treats a named function expression self-reference as bound', () => {
    const reports = runRule(
      rule,
      `function s() { const g = function fac(n) { return n <= 1 ? 1 : n * fac(n - 1); }; return g; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('flags both an outer and an inner pure helper', () => {
    const reports = runRule(
      rule,
      `function s() { const a = (n) => n + 1; function b(m) { return m * 2; } return [a, b]; }`,
    );
    expect(reports).toHaveLength(2);
  });

  it('treats a name bound by a nested variable declarator as in-scope', () => {
    const reports = runRule(
      rule,
      `function s() { const g = (n) => { const tmp = n * 2; return tmp; }; return g; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('treats a nested function-declaration name as bound (recursion stays pure)', () => {
    const reports = runRule(
      rule,
      `function s() { const g = (n) => { function step(m) { return m - 1; } return step(n); }; return g; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('treats an inner arrow expression and its params as bound', () => {
    const reports = runRule(
      rule,
      `function s() { const g = (xs) => xs.map((y) => y + 1); return g; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('treats a default-valued param as bound', () => {
    const reports = runRule(
      rule,
      `function s() { const g = (n = 1) => n * 2; return g; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('treats an object-rest param as bound', () => {
    const reports = runRule(
      rule,
      `function s() { const g = ({ a, ...rest }) => a + Object.keys(rest).length; return g; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('handles a body containing string-literal array elements and primitive object values', () => {
    const reports = runRule(
      rule,
      `function s() { const g = (n) => ['a', 'b'].includes(n) ? { ok: 1 } : { ok: 0 }; return g; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('ignores a side-effect-only import with no specifiers', () => {
    const reports = runRule(
      rule,
      `import './styles.css'; function s() { const g = (n) => n + 1; return g; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does not fire on a non-hoistable nested function declaration (closes over a local)', () => {
    const reports = runRule(
      rule,
      `function s() { const base = 5; function impure(n) { return n + base; } return impure; }`,
    );
    expect(reports).toEqual([]);
  });

  it('handles sparse array patterns and sparse array literals (holes)', () => {
    const reports = runRule(
      rule,
      `function s() { const g = ([a, , b]) => [a, , b, 1]; return g; }`,
    );
    expect(reports).toHaveLength(1);
  });
});
