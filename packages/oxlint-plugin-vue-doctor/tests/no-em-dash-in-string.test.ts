import { describe, expect, it } from 'vitest';
import { noEmDashInString } from '../src/rules/ai-slop/no-em-dash-in-string.js';
import type { AstNode } from '../src/rule-types.js';
import { runRule } from './run-rule.js';

const rule = noEmDashInString;
const EM_DASH = '\u2014';

describe('no-em-dash-in-string', () => {
  it('fires on a string literal containing an em dash', () => {
    const reports = runRule(rule, `const s = "before${EM_DASH}after";`);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.type).toBe('Literal');
    expect(reports[0]!.message).toContain('AI-generated');
  });

  it('does NOT fire on a non-string literal (number)', () => {
    const reports = runRule(rule, `const n = 42;`);
    expect(reports).toEqual([]);
  });

  it('does NOT fire on a string literal without an em dash', () => {
    const reports = runRule(rule, `const s = "plain hyphen - here";`);
    expect(reports).toEqual([]);
  });
});

describe('no-em-dash-in-string fix', () => {
  it('declares meta.fixable code', () => {
    expect(rule.meta?.fixable).toBe('code');
  });

  it('replaces the em dash with a hyphen in a double-quoted literal', () => {
    const reports = runRule(rule, `const s = "before${EM_DASH}after";`, {
      applyFix: true,
    });
    expect(reports[0]!.fixed).toBe(`"before-after"`);
  });

  it('replaces the em dash in a single-quoted literal preserving quotes', () => {
    const reports = runRule(rule, `const s = 'a${EM_DASH}b';`, {
      applyFix: true,
    });
    expect(reports[0]!.fixed).toBe(`'a-b'`);
  });

  it('replaces every em dash when several appear in one literal', () => {
    const reports = runRule(rule, `const s = "x${EM_DASH}y${EM_DASH}z";`, {
      applyFix: true,
    });
    expect(reports[0]!.fixed).toBe(`"x-y-z"`);
  });

  it('returns null for an escaped \\u2014 literal so the source is never corrupted', () => {
    const node: AstNode = {
      type: 'Literal',
      value: `a${EM_DASH}b`,
      raw: `"a\\u2014b"`,
    };
    expect(rule.fix!(node)).toBeNull();
  });

  it('returns null for a non-string literal value', () => {
    const node: AstNode = { type: 'Literal', value: 42, raw: '42' };
    expect(rule.fix!(node)).toBeNull();
  });

  it('returns null when the node has no raw source text', () => {
    const node: AstNode = { type: 'Literal', value: `a${EM_DASH}b` };
    expect(rule.fix!(node)).toBeNull();
  });

  it('produces a hyphenated raw literal for a directly supplied node', () => {
    const node: AstNode = {
      type: 'Literal',
      value: `a${EM_DASH}b`,
      raw: `"a${EM_DASH}b"`,
    };
    expect(rule.fix!(node)).toBe(`"a-b"`);
  });
});
