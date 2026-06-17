import { describe, expect, it } from 'vitest';
import { defineEventHandlerTyped } from '../src/rules/nuxt/server-routes/defineEventHandler-typed.js';
import { runRule } from './run-rule.js';

const rule = defineEventHandlerTyped;

describe('server-routes/defineEventHandler-typed', () => {
  it('fires when defineEventHandler has no type and event param has no annotation', () => {
    const reports = runRule(
      rule,
      `defineEventHandler((event) => { return event; });`,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('H3Event');
  });

  it('fires on plain function with no type annotation', () => {
    const reports = runRule(
      rule,
      `defineEventHandler(function(event) { return event; });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire when defineEventHandler has type argument', () => {
    const reports = runRule(
      rule,
      `defineEventHandler<{ id: string }>((event) => { return event.id; });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire when event param has type annotation', () => {
    const reports = runRule(
      rule,
      `defineEventHandler((event: H3Event) => { return event; });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire when both type arg and param annotation are present', () => {
    const reports = runRule(
      rule,
      `defineEventHandler<{ id: string }>((event: H3Event) => { return event.id; });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on plain defineEventHandler call without handler', () => {
    const reports = runRule(rule, `defineEventHandler();`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on plain function expression not in defineEventHandler', () => {
    const reports = runRule(rule, `function(event) { return event; }`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on defineEventHandler with typed arrow fn', () => {
    const reports = runRule(
      rule,
      `defineEventHandler<Event>((event) => { return event; });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on defineEventHandler with untyped arrow but typed param', () => {
    const reports = runRule(
      rule,
      `defineEventHandler((event: Event) => { return event; });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on defineEventHandler with one arg (no event param)', () => {
    const reports = runRule(
      rule,
      `defineEventHandler(() => { return 'ok'; });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on defineEventHandler with non-function first arg', () => {
    const reports = runRule(rule, `defineEventHandler('not a function');`);
    expect(reports).toEqual([]);
  });

  it('fires on defineEventHandler with no args', () => {
    const reports = runRule(rule, `defineEventHandler();`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on MemberExpression callee for defineEventHandler', () => {
    const reports = runRule(
      rule,
      `handler.defineEventHandler((event) => { return event; });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on an unrelated identifier-callee call', () => {
    const reports = runRule(
      rule,
      `defineComponent((event) => { return event; });`,
    );
    expect(reports).toEqual([]);
  });
});
