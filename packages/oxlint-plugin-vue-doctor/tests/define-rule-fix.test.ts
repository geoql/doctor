import { describe, expect, it } from 'vitest';
import { defineRule } from '../src/define-rule.js';
import type { AstNode, Rule } from '../src/rule-types.js';

describe('defineRule fix infrastructure', () => {
  it('accepts a rule that supplies an optional fix function and passes it through', () => {
    const rule: Rule = defineRule({
      create() {
        return {};
      },
      fix(node: AstNode) {
        return `/* fixed ${node.type} */`;
      },
    });
    expect(typeof rule.fix).toBe('function');
    expect(rule.fix!({ type: 'Identifier' })).toBe('/* fixed Identifier */');
  });

  it('leaves fix undefined for a rule that does not declare one', () => {
    const rule = defineRule({
      create() {
        return {};
      },
    });
    expect(rule.fix).toBeUndefined();
  });
});
