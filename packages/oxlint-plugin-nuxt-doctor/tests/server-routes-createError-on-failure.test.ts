import { describe, expect, it } from 'vitest';
import { createErrorOnFailure } from '../src/rules/server-routes/createError-on-failure.js';
import { runRule } from './run-rule.js';

const rule = createErrorOnFailure;

describe('server-routes/createError-on-failure', () => {
  it('fires on throw new Error() inside defineEventHandler', () => {
    const reports = runRule(
      rule,
      `defineEventHandler(() => { throw new Error('oops'); });`,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('createError');
  });

  it('fires on throw new Error() inside defineEventHandler with function keyword', () => {
    const reports = runRule(
      rule,
      `defineEventHandler(function() { throw new Error('fail'); });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire on throw createError() inside defineEventHandler', () => {
    const reports = runRule(
      rule,
      `defineEventHandler(() => { throw createError({ statusCode: 500 }); });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on throw new Error() outside defineEventHandler', () => {
    const reports = runRule(rule, `throw new Error('oops');`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on throw something that is not new Error()', () => {
    const reports = runRule(
      rule,
      `defineEventHandler(() => { throw 'string error'; });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on defineEventHandler without throw', () => {
    const reports = runRule(
      rule,
      `defineEventHandler(() => { return { ok: true }; });`,
    );
    expect(reports).toEqual([]);
  });

  it('fires on throw new Error() in nested function inside defineEventHandler', () => {
    const reports = runRule(
      rule,
      `defineEventHandler(() => { function inner() { throw new Error('x'); } return inner(); });`,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('createError');
  });

  it('does NOT fire on throw createError with no argument inside defineEventHandler', () => {
    const reports = runRule(
      rule,
      `defineEventHandler(() => { throw createError(); });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on throw new Error() inside arrow function inside defineEventHandler', () => {
    const reports = runRule(
      rule,
      `defineEventHandler(() => { const fn = () => { throw new Error('x'); }; return fn(); });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire on throw new Error() inside FunctionExpression inside defineEventHandler', () => {
    const reports = runRule(
      rule,
      `defineEventHandler(() => { const fn = function() { throw new Error('x'); }; return fn(); });`,
    );
    expect(reports).toHaveLength(1);
  });
});
