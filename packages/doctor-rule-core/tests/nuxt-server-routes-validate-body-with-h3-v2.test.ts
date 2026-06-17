import { describe, expect, it } from 'vitest';
import { validateBodyWithH3V2 } from '../src/rules/nuxt/server-routes/validate-body-with-h3-v2.js';
import { runRule } from './run-rule.js';

const rule = validateBodyWithH3V2;

describe('server-routes/validate-body-with-h3-v2', () => {
  it('fires on readBody inside defineEventHandler', () => {
    const reports = runRule(
      rule,
      `defineEventHandler(async (event) => { const body = await readBody(event); return body; });`,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('readValidatedBody');
  });

  it('fires on readBody inside defineEventHandler with function keyword', () => {
    const reports = runRule(
      rule,
      `defineEventHandler(function(event) { const body = readBody(event); return body; });`,
    );
    expect(reports).toHaveLength(1);
  });

  it('fires on readBody outside defineEventHandler', () => {
    const reports = runRule(rule, `const body = readBody(event);`);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('readValidatedBody');
  });

  it('does NOT fire on readValidatedBody inside defineEventHandler', () => {
    const reports = runRule(
      rule,
      `defineEventHandler(async (event) => { const body = await readValidatedBody(event); return body; });`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on unrelated function calls', () => {
    const reports = runRule(rule, `const x = readFile('test.txt');`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on readBody with MemberExpression callee', () => {
    const reports = runRule(rule, `const body = body.readBody(event);`);
    expect(reports).toHaveLength(0);
  });

  it('does NOT fire on readBody with no arguments', () => {
    const reports = runRule(rule, `const body = readBody();`);
    expect(reports).toHaveLength(1);
  });
});
