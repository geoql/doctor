import { describe, expect, it } from 'vitest';
import { noEvalLike } from '../src/rules/vue/security/no-eval-like.js';
import { runRule } from './run-rule.js';

const rule = noEvalLike;

describe('security/no-eval-like', () => {
  it('fires on eval()', () => {
    const reports = runRule(rule, `eval(code);`);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('eval');
  });

  it('fires on new Function()', () => {
    expect(runRule(rule, `const f = new Function('return 1');`)).toHaveLength(
      1,
    );
  });

  it('fires on setTimeout with a string argument', () => {
    expect(runRule(rule, `setTimeout('doStuff()', 1000);`)).toHaveLength(1);
  });

  it('fires on setInterval with a string argument', () => {
    expect(runRule(rule, `setInterval('tick()', 500);`)).toHaveLength(1);
  });

  it('fires on setTimeout with a template-literal string argument', () => {
    expect(runRule(rule, 'setTimeout(`run(${x})`, 0);')).toHaveLength(1);
  });

  it('does NOT fire on setTimeout with a function argument', () => {
    expect(runRule(rule, `setTimeout(() => doStuff(), 1000);`)).toEqual([]);
  });

  it('does NOT fire on a member eval like obj.eval()', () => {
    expect(runRule(rule, `obj.eval(code);`)).toEqual([]);
  });

  it('does NOT fire on JSON.parse or new Date', () => {
    expect(runRule(rule, `JSON.parse(data);\nconst d = new Date();`)).toEqual(
      [],
    );
  });

  it('does NOT fire on setTimeout with a non-string first arg variable', () => {
    expect(runRule(rule, `setTimeout(handler, 1000);`)).toEqual([]);
  });

  it('does NOT fire on setTimeout with no arguments', () => {
    expect(runRule(rule, `setTimeout();`)).toEqual([]);
  });

  it('does NOT fire on setTimeout with a numeric literal first arg', () => {
    expect(runRule(rule, `setTimeout(0, 1000);`)).toEqual([]);
  });

  it('does NOT fire on a member-expression callee like a.setTimeout(str)', () => {
    expect(runRule(rule, `a.setTimeout('x()', 1);`)).toEqual([]);
  });
});
