import { describe, expect, it } from 'vitest';
import { noProcessClientServer } from '../src/rules/ai-slop/no-process-client-server.js';
import { runRule } from './run-rule.js';

const rule = noProcessClientServer;

describe('ai-slop/no-process-client-server', () => {
  it('fires on process.client', () => {
    const reports = runRule(rule, `const x = process.client;`);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.type).toBe('MemberExpression');
    expect(reports[0]!.message).toContain('import.meta.client');
  });

  it('fires on process.server', () => {
    const reports = runRule(rule, `if (process.server) { doSomething(); }`);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('import.meta.server');
  });

  it('fires on process.browser', () => {
    const reports = runRule(rule, `const isBrowser = process.browser;`);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.message).toContain('import.meta.browser');
  });

  it('does NOT fire on import.meta.client', () => {
    const reports = runRule(rule, `if (import.meta.client) { doSomething(); }`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on import.meta.server', () => {
    const reports = runRule(rule, `if (import.meta.server) { doSomething(); }`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on unrelated process property', () => {
    const reports = runRule(rule, `process.env.NODE_ENV;`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a plain identifier named process', () => {
    const reports = runRule(rule, `const p = process;`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on process[expr] computed access', () => {
    const reports = runRule(rule, `const key = 'client'; process[key];`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on MemberExpression that is not process.*', () => {
    const reports = runRule(rule, `const x = something.client;`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on process with computed string property', () => {
    const reports = runRule(rule, `const x = process['client'];`);
    expect(reports).toEqual([]);
  });
});
