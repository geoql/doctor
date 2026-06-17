import { describe, expect, it, vi } from 'vitest';
import { defineRule } from '../src/define-rule.js';
import type {
  AstNode,
  Fixer,
  ReportDescriptor,
  Rule,
  RuleContext,
} from '../src/types.js';

const fixer: Fixer = {
  replaceText: (node, text) => ({ range: [0, 0], text, node }),
};

describe('defineRule fix infrastructure', () => {
  it('accepts a rule that supplies an optional fix function and passes it through', () => {
    const rule: Rule = defineRule({
      create() {
        return {};
      },
      fix(node: AstNode) {
        return `fixed ${node.type}`;
      },
    });
    expect(typeof rule.fix).toBe('function');
    expect(rule.fix!({ type: 'Identifier' })).toBe('fixed Identifier');
  });

  it('leaves fix undefined for a rule that does not declare one', () => {
    const rule = defineRule({
      create() {
        return {};
      },
    });
    expect(rule.fix).toBeUndefined();
  });

  it('does not set meta.fixable for a rule without a fix', () => {
    const rule = defineRule({
      create() {
        return {};
      },
    });
    expect(rule.meta?.fixable).toBeUndefined();
  });

  it('sets meta.fixable to "code" for a rule that declares a fix', () => {
    const rule = defineRule({
      create() {
        return {};
      },
      fix() {
        return 'x';
      },
    });
    expect(rule.meta?.fixable).toBe('code');
  });

  it('preserves a pre-existing meta object while adding fixable', () => {
    const rule = defineRule({
      meta: { name: 'demo' },
      create() {
        return {};
      },
      fix() {
        return 'x';
      },
    });
    expect(rule.meta).toEqual({ name: 'demo', fixable: 'code' });
  });

  it('attaches a fixer that replaces the node when fix returns a string', () => {
    const target: AstNode = { type: 'Literal' };
    const rule = defineRule({
      create(context: RuleContext) {
        return {
          Literal() {
            context.report({ node: target, message: 'boom' });
          },
        };
      },
      fix() {
        return 'REPLACED';
      },
    });
    let captured: ReportDescriptor | undefined;
    const context: RuleContext = {
      report: (descriptor) => {
        captured = descriptor;
      },
    };
    rule.create(context).Literal!(target);
    expect(captured!.message).toBe('boom');
    expect(typeof captured!.fix).toBe('function');
    expect(captured!.fix!(fixer)).toEqual({
      range: [0, 0],
      text: 'REPLACED',
      node: target,
    });
  });

  it('reports without a fixer when fix returns null', () => {
    const target: AstNode = { type: 'Literal' };
    const rule = defineRule({
      create(context: RuleContext) {
        return {
          Literal() {
            context.report({ node: target, message: 'boom' });
          },
        };
      },
      fix() {
        return null;
      },
    });
    let captured: ReportDescriptor | undefined;
    const context: RuleContext = {
      report: (descriptor) => {
        captured = descriptor;
      },
    };
    rule.create(context).Literal!(target);
    expect(captured!.message).toBe('boom');
    expect(captured!.fix).toBeUndefined();
  });

  it('does not wrap create when no fix is declared', () => {
    const inner = vi.fn(() => ({}));
    const rule = defineRule({ create: inner });
    const context: RuleContext = { report: () => {} };
    rule.create(context);
    expect(inner).toHaveBeenCalledWith(context);
  });
});
