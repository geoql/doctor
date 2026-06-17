import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const EM_DASH = '\u2014';

interface LiteralNode extends AstNode {
  type: 'Literal';
  value: unknown;
}

export const noEmDashInString = defineRule({
  create(context: RuleContext) {
    return {
      Literal(node: AstNode) {
        const literal = node as LiteralNode;
        if (typeof literal.value !== 'string') return;
        if (!literal.value.includes(EM_DASH)) return;
        context.report({
          node,
          message:
            'Em dash in string literal reads as AI-generated output; use comma, colon, or parentheses.',
        });
      },
    };
  },
  fix(node: AstNode) {
    const literal = node as LiteralNode;
    if (typeof literal.value !== 'string') return null;
    const raw = literal.raw;
    if (typeof raw !== 'string') return null;
    if (!raw.includes(EM_DASH)) return null;
    return raw.split(EM_DASH).join('-');
  },
});
