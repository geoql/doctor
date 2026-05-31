import { describe, expect, it } from 'vitest';
import { clientOnlyForBrowserApis } from '../src/rules/hydration/clientOnly-for-browser-apis.js';
import type {
  AstNode,
  ReportDescriptor,
  RuleContext,
} from '../src/rule-types.js';
import { runRule } from './run-rule.js';

const rule = clientOnlyForBrowserApis;

// Drives visitors directly with a malformed MetaProperty guard the oxc parser
// can never emit, then checks a top-level window.location still reports.
function reportsAfterGuard(guardObject: AstNode): number {
  const reports: ReportDescriptor[] = [];
  const context: RuleContext = {
    report: (descriptor: ReportDescriptor) => reports.push(descriptor),
    capabilities: new Set<string>(),
  };
  const visitors = rule.create(context);
  const ifNode = {
    type: 'IfStatement',
    test: {
      type: 'MemberExpression',
      object: guardObject,
      property: { type: 'Identifier', name: 'client' },
    },
  } as unknown as AstNode;
  visitors['IfStatement']!(ifNode);
  const windowNode = {
    type: 'MemberExpression',
    object: { type: 'Identifier', name: 'window' },
    property: { type: 'Identifier', name: 'location' },
    loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 6 } },
  } as unknown as AstNode;
  visitors['MemberExpression']!(windowNode);
  return reports.length;
}

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

  it('STILL fires inside import.meta.server guard (wrong flag)', () => {
    const reports = runRule(
      rule,
      `if (import.meta.server) { const loc = window.location; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('STILL fires inside process.server guard (wrong flag)', () => {
    const reports = runRule(
      rule,
      `if (process.server) { const loc = window.location; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('STILL fires inside an unrelated if guard with member test', () => {
    const reports = runRule(
      rule,
      `if (foo.bar) { const loc = window.location; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('STILL fires inside an if guard with bare identifier test', () => {
    const reports = runRule(rule, `if (cond) { const loc = window.location; }`);
    expect(reports).toHaveLength(1);
  });

  it('STILL fires inside a new.target guard (not import.meta)', () => {
    const reports = runRule(
      rule,
      `if (new.target.client) { const loc = window.location; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('STILL fires inside import.meta with computed client member', () => {
    const reports = runRule(
      rule,
      `if (import.meta["client"]) { const loc = window.location; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('STILL fires inside process with computed client member', () => {
    const reports = runRule(
      rule,
      `if (process["client"]) { const loc = window.location; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('STILL fires inside a deep member if guard', () => {
    const reports = runRule(
      rule,
      `if (a.b.client) { const loc = window.location; }`,
    );
    expect(reports).toHaveLength(1);
  });

  it('does NOT fire on window inside a function containing an if guard', () => {
    const reports = runRule(
      rule,
      `function f() { if (import.meta.client) { const loc = window.location; } }`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on window inside a nested arrow function', () => {
    const reports = runRule(
      rule,
      `const f = () => { const g = () => { const loc = window.location; }; };`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on window inside a nested function expression', () => {
    const reports = runRule(
      rule,
      `const f = function () { const g = function () { const loc = window.location; }; };`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on window inside a nested function declaration', () => {
    const reports = runRule(
      rule,
      `function outer() { function inner() { const loc = window.location; } }`,
    );
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a deep member expression whose object is not an identifier', () => {
    const reports = runRule(rule, `const x = a.b.c;`);
    expect(reports).toEqual([]);
  });

  it('STILL fires when meta-property meta is not an Identifier', () => {
    const guard = {
      type: 'MetaProperty',
      meta: { type: 'Literal', value: 'import' },
      property: { type: 'Identifier', name: 'meta' },
    } as unknown as AstNode;
    expect(reportsAfterGuard(guard)).toBe(1);
  });

  it('STILL fires when meta-property property is not an Identifier', () => {
    const guard = {
      type: 'MetaProperty',
      meta: { type: 'Identifier', name: 'import' },
      property: { type: 'Literal', value: 'meta' },
    } as unknown as AstNode;
    expect(reportsAfterGuard(guard)).toBe(1);
  });

  it('STILL fires when meta-property property name is not "meta"', () => {
    const guard = {
      type: 'MetaProperty',
      meta: { type: 'Identifier', name: 'import' },
      property: { type: 'Identifier', name: 'source' },
    } as unknown as AstNode;
    expect(reportsAfterGuard(guard)).toBe(1);
  });
});
