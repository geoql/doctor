import { defineRule } from '../../define-rule.js';
import type { AstNode, RuleContext } from '../../rule-types.js';

const DOCS_URL = 'https://h3.unjs.io/guide/typed';
const MESSAGE = `defineEventHandler handler param event lacks a type annotation. Add a generic: defineEventHandler<H3Event>(...) or type the event parameter explicitly. See ${DOCS_URL}`;

function isFunction(node: AstNode | undefined): boolean {
  return (
    node?.type === 'ArrowFunctionExpression' ||
    node?.type === 'FunctionExpression'
  );
}

export const defineEventHandlerTyped = defineRule({
  create(context: RuleContext) {
    return {
      CallExpression(node: AstNode) {
        const callee = node.callee as AstNode | undefined;
        if (callee?.type !== 'Identifier') return;
        if (
          (callee as AstNode & { name: string }).name !== 'defineEventHandler'
        )
          return;
        if (node.typeArguments) return;
        const args = node.arguments as AstNode[];
        if (args.length === 0) return;
        const handler = args[0];
        if (!isFunction(handler)) return;
        const params = (handler as AstNode & { params: AstNode[] }).params;
        if (!params || params.length === 0) return;
        const eventParam = params[0] as AstNode;
        if (eventParam.typeAnnotation) return;
        context.report({ node, message: MESSAGE });
      },
    };
  },
});
