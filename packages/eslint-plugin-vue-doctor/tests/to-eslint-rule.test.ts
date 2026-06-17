import tsParser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import type { AstNode } from '@geoql/doctor-rule-core';
import { noEmDashInString } from '@geoql/doctor-rule-core';
import { describe, expect, it, vi } from 'vitest';
import { deriveCapabilities, toESLintRule } from '../src/to-eslint-rule.js';

const EM_DASH = '\u2014';

const tsRuleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    sourceType: 'module',
    ecmaVersion: 2024,
  },
});

function stubContext() {
  return {
    report: vi.fn(),
    getFilename: vi.fn(() => 'test.ts'),
    filename: 'test.ts',
    settings: {},
  } as unknown as Parameters<ReturnType<typeof toESLintRule>['create']>[0];
}

describe('toESLintRule adapter', () => {
  it('wraps a core rule into an ESLint rule that reports and fixes', () => {
    const rule = toESLintRule({
      id: 'no-em-dash-in-string',
      category: 'ai-slop',
      severity: 'warn',
      recommended: true,
      ...noEmDashInString,
    });
    tsRuleTester.run('no-em-dash-in-string', rule, {
      valid: [{ code: `const s = "loading please wait";` }],
      invalid: [
        {
          code: `const s = "loading${EM_DASH}please wait";`,
          output: `const s = "loading-please wait";`,
          errors: 1,
        },
      ],
    });
  });

  it('marks fixable core rules as meta.fixable code', () => {
    const rule = toESLintRule({
      id: 'no-em-dash-in-string',
      category: 'ai-slop',
      severity: 'warn',
      recommended: true,
      ...noEmDashInString,
    });
    expect(rule.meta?.fixable).toBe('code');
  });

  it('does not mark non-fixable core rules as meta.fixable', () => {
    const rule = toESLintRule({
      id: 'no-fixable',
      category: 'ai-slop',
      severity: 'warn',
      recommended: true,
      create: () => ({}),
    });
    expect(rule.meta?.fixable).toBeUndefined();
  });

  it('reports without a fix when the descriptor has no fix', () => {
    const rule = toESLintRule({
      id: 'report-only',
      category: 'ai-slop',
      severity: 'warn',
      recommended: true,
      create(context) {
        return {
          Identifier(node) {
            context.report({ node, message: 'report only' });
          },
        };
      },
    });
    const context = stubContext();
    const visitors = rule.create(context);
    const eslintNode = { type: 'Identifier', range: [0, 4] } as const;
    visitors.Identifier(
      eslintNode as unknown as Parameters<typeof visitors.Identifier>[0],
    );
    expect(context.report).toHaveBeenCalledWith({
      node: eslintNode,
      message: 'report only',
    });
  });

  it('skips non-function visitor values', () => {
    const rule = toESLintRule({
      id: 'mixed-visitors',
      category: 'ai-slop',
      severity: 'warn',
      recommended: true,
      create() {
        return {
          Identifier: () => {},
          Program: undefined as unknown as (node: AstNode) => void,
        };
      },
    });
    const context = stubContext();
    const visitors = rule.create(context);
    expect(Object.keys(visitors)).toContain('Identifier');
    expect(Object.keys(visitors)).not.toContain('Program');
  });

  it('exposes getFilename to core rules', () => {
    let filename: string | undefined;
    const rule = toESLintRule({
      id: 'filename-rule',
      category: 'ai-slop',
      severity: 'warn',
      recommended: true,
      create(context) {
        return {
          Program() {
            filename = context.getFilename?.();
          },
        };
      },
    });
    const context = stubContext();
    const visitors = rule.create(context);
    visitors.Program({
      type: 'Program',
      range: [0, 0],
    } as unknown as Parameters<typeof visitors.Program>[0]);
    expect(filename).toBe('test.ts');
  });
  it('falls back to range [0, 0] when a fix node has no range', () => {
    const rule = toESLintRule({
      id: 'no-range-fix',
      category: 'ai-slop',
      severity: 'warn',
      recommended: true,
      meta: { fixable: 'code' },
      create(context) {
        return {
          Identifier(node) {
            context.report({
              node,
              message: 'no range',
              fix(fixer) {
                return fixer.replaceText(
                  { type: 'Identifier', loc: node.loc } as AstNode,
                  'X',
                );
              },
            });
          },
        };
      },
    });
    const context = stubContext();
    const visitors = rule.create(context);
    visitors.Identifier({
      type: 'Identifier',
      range: [1, 5],
      loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 4 } },
    } as unknown as Parameters<typeof visitors.Identifier>[0]);
    const reportCall = (context.report as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as {
      fix?: (fixer: {
        replaceTextRange: (range: [number, number], text: string) => unknown;
      }) => unknown;
    };
    const result = reportCall.fix?.({
      replaceTextRange: (range, text) => ({ range, text }),
    });
    expect(result).toEqual({ range: [0, 0], text: 'X' });
  });
});

describe('deriveCapabilities', () => {
  it('returns an empty set when no settings are provided', () => {
    expect(deriveCapabilities(undefined).size).toBe(0);
  });

  it('reads the capabilities array from the vue-doctor settings namespace', () => {
    const caps = deriveCapabilities({
      'vue-doctor': { capabilities: ['auto-imports:vue'] },
    });
    expect(caps.has('auto-imports:vue')).toBe(true);
  });

  it('ignores a non-array capabilities value', () => {
    const caps = deriveCapabilities({ 'vue-doctor': { capabilities: 'nope' } });
    expect(caps.size).toBe(0);
  });

  it('returns an empty set when the namespace is missing', () => {
    expect(
      deriveCapabilities({ 'other-plugin': { capabilities: ['x'] } }).size,
    ).toBe(0);
  });

  it('filters out non-string capability entries', () => {
    const caps = deriveCapabilities({
      'vue-doctor': { capabilities: ['valid', 123, null, undefined, {}, true] },
    });
    expect([...caps]).toEqual(['valid']);
  });
});
