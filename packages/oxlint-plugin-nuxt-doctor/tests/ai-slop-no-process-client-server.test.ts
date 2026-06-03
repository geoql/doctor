import { describe, expect, it } from 'vitest';
import { noProcessClientServer } from '../src/rules/ai-slop/no-process-client-server.js';
import type { AstNode } from '../src/rule-types.js';
import { runRule } from './run-rule.js';

const rule = noProcessClientServer;

function processMember(prop: string): AstNode {
  return {
    type: 'MemberExpression',
    object: { type: 'Identifier', name: 'process' },
    property: { type: 'Identifier', name: prop },
  };
}

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

describe('ai-slop/no-process-client-server fix', () => {
  it('declares meta.fixable code', () => {
    expect(rule.meta?.fixable).toBe('code');
  });

  it('rewrites process.client to import.meta.client', () => {
    const reports = runRule(rule, `const x = process.client;`, {
      applyFix: true,
    });
    expect(reports[0]!.fixed).toBe('import.meta.client');
  });

  it('rewrites process.server to import.meta.server', () => {
    const reports = runRule(rule, `if (process.server) { go(); }`, {
      applyFix: true,
    });
    expect(reports[0]!.fixed).toBe('import.meta.server');
  });

  it('rewrites process.browser to import.meta.browser', () => {
    const reports = runRule(rule, `const b = process.browser;`, {
      applyFix: true,
    });
    expect(reports[0]!.fixed).toBe('import.meta.browser');
  });

  it('returns the rewrite directly for a crafted process.client node', () => {
    expect(rule.fix!(processMember('client'))).toBe('import.meta.client');
  });

  it('returns null when the object is not the process identifier', () => {
    const node: AstNode = {
      type: 'MemberExpression',
      object: { type: 'Identifier', name: 'globalThis' },
      property: { type: 'Identifier', name: 'client' },
    };
    expect(rule.fix!(node)).toBeNull();
  });

  it('returns null when the object is not an identifier', () => {
    const node: AstNode = {
      type: 'MemberExpression',
      object: { type: 'MemberExpression' },
      property: { type: 'Identifier', name: 'client' },
    };
    expect(rule.fix!(node)).toBeNull();
  });

  it('returns null when the property is not an identifier', () => {
    const node: AstNode = {
      type: 'MemberExpression',
      object: { type: 'Identifier', name: 'process' },
      property: { type: 'Literal', value: 'client' },
    };
    expect(rule.fix!(node)).toBeNull();
  });

  it('returns null for a non-legacy process property', () => {
    const node: AstNode = {
      type: 'MemberExpression',
      object: { type: 'Identifier', name: 'process' },
      property: { type: 'Identifier', name: 'env' },
    };
    expect(rule.fix!(node)).toBeNull();
  });
});
