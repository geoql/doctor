import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL = 'https://h3.unjs.io/guide/throw';
const MESSAGE = `throw new Error() leaks the call stack and exposes internal details. Use throw createError() from h3 for proper HTTP errors with no stack leak. See ${DOCS_URL}`;

export const createErrorOnFailure = defineRule({
  create(context: RuleContext) {
    let handlerDepth = 0;

    return {
      CallExpression(node: AstNode) {
        const callee = node.callee as AstNode | undefined;
        if (callee?.type !== 'Identifier') return;
        if (
          (callee as AstNode & { name: string }).name !== 'defineEventHandler'
        )
          return;
        handlerDepth++;
      },
      'CallExpression:exit'(node: AstNode) {
        const callee = node.callee as AstNode | undefined;
        if (callee?.type !== 'Identifier') return;
        if (
          (callee as AstNode & { name: string }).name !== 'defineEventHandler'
        )
          return;
        handlerDepth--;
      },
      ThrowStatement(node: AstNode) {
        if (handlerDepth === 0) return;
        const arg = node.argument as AstNode | undefined;
        if (!arg || arg.type !== 'NewExpression') return;
        const ctor = arg.callee as AstNode | undefined;
        if (ctor?.type !== 'Identifier') return;
        if ((ctor as AstNode & { name: string }).name !== 'Error') return;
        context.report({ node, message: MESSAGE });
      },
    };
  },
});
