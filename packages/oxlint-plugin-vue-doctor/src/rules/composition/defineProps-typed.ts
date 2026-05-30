import { defineRule } from '../../define-rule.js';
import type { AstNode, RuleContext } from '../../rule-types.js';

const DOCS_URL =
  'https://vuejs.org/guide/typescript/composition-api.html#typing-component-props';
const MESSAGE = `This defineProps() call declares props with a runtime object, which discards static type information. Use the type-only generic form (defineProps<{ ... }>()) so props are fully typed. See ${DOCS_URL}`;

function calleeName(node: AstNode): string | undefined {
  const callee = node.callee as AstNode | undefined;
  if (callee?.type === 'Identifier') return callee.name as string;
  return undefined;
}

export const definePropsTyped = defineRule({
  create(context: RuleContext) {
    return {
      CallExpression(node: AstNode) {
        if (calleeName(node) !== 'defineProps') return;
        const firstArg = (node.arguments as AstNode[])[0];
        if (firstArg?.type === 'ObjectExpression') {
          context.report({ node, message: MESSAGE });
        }
      },
    };
  },
});
