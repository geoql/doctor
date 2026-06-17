import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL =
  'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_eval!';
const MESSAGE = `eval, new Function, and string-argument setTimeout/setInterval execute arbitrary code and are XSS/RCE vectors. Replace with explicit logic or JSON.parse for data. See ${DOCS_URL}`;

const STRING_TIMER_CALLEES = new Set(['setTimeout', 'setInterval']);

function calleeName(node: AstNode): string | undefined {
  const callee = node.callee as AstNode | undefined;
  if (callee?.type === 'Identifier') return callee.name as string;
  return undefined;
}

function isStringArg(node: AstNode | undefined): boolean {
  if (!node) return false;
  if (node.type === 'Literal') return typeof node.value === 'string';
  return node.type === 'TemplateLiteral';
}

export const noEvalLike = defineRule({
  create(context: RuleContext) {
    return {
      CallExpression(node: AstNode) {
        const name = calleeName(node);
        if (name === undefined) return;
        if (name === 'eval') {
          context.report({ node, message: MESSAGE });
          return;
        }
        if (STRING_TIMER_CALLEES.has(name)) {
          const args = node.arguments as AstNode[] | undefined;
          if (isStringArg(args?.[0])) {
            context.report({ node, message: MESSAGE });
          }
        }
      },
      NewExpression(node: AstNode) {
        const callee = node.callee as AstNode | undefined;
        if (callee?.type === 'Identifier' && callee.name === 'Function') {
          context.report({ node, message: MESSAGE });
        }
      },
    };
  },
});
