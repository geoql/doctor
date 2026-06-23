import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL = 'https://vuejs.org/guide/best-practices/performance.html';
const MESSAGE = `This computed falls back to a fresh empty array or object literal, so it returns a brand-new reference whenever the source is nullish. Downstream watchers, child props, and v-memo see an identity change every recompute. Hoist a single module-scope EMPTY constant and fall back to that. See ${DOCS_URL}`;

function isEmptyLiteral(node: AstNode | undefined): boolean {
  if (node?.type === 'ArrayExpression') {
    return (node.elements as unknown[]).length === 0;
  }
  if (node?.type === 'ObjectExpression') {
    return (node.properties as unknown[]).length === 0;
  }
  return false;
}

function fallsBackToEmptyLiteral(node: AstNode): boolean {
  if (node.type === 'LogicalExpression') {
    const op = node.operator;
    if (op !== '??' && op !== '||') return false;
    return isEmptyLiteral(node.right as AstNode);
  }
  if (node.type === 'ConditionalExpression') {
    return (
      isEmptyLiteral(node.consequent as AstNode) ||
      isEmptyLiteral(node.alternate as AstNode)
    );
  }
  return false;
}

function getterBody(node: AstNode): AstNode | undefined {
  const first = (node.arguments as AstNode[])[0];
  if (
    first?.type !== 'ArrowFunctionExpression' &&
    first?.type !== 'FunctionExpression'
  ) {
    return undefined;
  }
  const body = first.body as AstNode;
  if (body.type !== 'BlockStatement') return body;
  const statements = body.body as AstNode[];
  for (const stmt of statements) {
    if (stmt.type === 'ReturnStatement') {
      return stmt.argument as AstNode | undefined;
    }
  }
  return undefined;
}

export const preferStableEmptyFallback = defineRule({
  create(context: RuleContext) {
    return {
      CallExpression(node: AstNode) {
        const callee = node.callee as AstNode | undefined;
        if (callee?.type !== 'Identifier' || callee.name !== 'computed') return;
        const returned = getterBody(node);
        if (returned && fallsBackToEmptyLiteral(returned)) {
          context.report({ node: returned, message: MESSAGE });
        }
      },
    };
  },
});
