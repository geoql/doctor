import { describe, expect, it } from 'vitest';
import { noEmDashInString } from '../src/rules/ai-slop/no-em-dash-in-string.js';
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
