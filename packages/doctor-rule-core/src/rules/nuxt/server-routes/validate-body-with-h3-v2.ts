import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL = 'https://nuxt.com/docs/4.x/guide/data-fetching';
const MESSAGE = `readBody() is the legacy H3 reader. In Nuxt 4 with h3 v2, use readValidatedBody to parse and validate the request body in one step. See ${DOCS_URL}`;

export const validateBodyWithH3V2 = defineRule({
  create(context: RuleContext) {
    return {
      CallExpression(node: AstNode) {
        const callee = node.callee as AstNode | undefined;
        if (callee?.type !== 'Identifier') return;
        if ((callee as AstNode & { name: string }).name !== 'readBody') return;
        context.report({ node, message: MESSAGE });
      },
    };
  },
});
