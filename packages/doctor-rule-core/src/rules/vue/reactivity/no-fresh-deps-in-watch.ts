import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL =
  'https://vuejs.org/guide/essentials/watchers.html#watch-source-types';
const MESSAGE = `This watch getter returns a freshly-constructed array or object literal, so Vue compares it by reference (Object.is) and the watcher re-fires on every reactive tick — even when nothing changed. Use the multi-source array form watch([a, b], cb) for several sources, or watch a primitive/ref directly. See ${DOCS_URL}`;

function isFunction(node: AstNode | undefined): boolean {
  return (
    node?.type === 'ArrowFunctionExpression' ||
    node?.type === 'FunctionExpression'
  );
}

function unwrap(node: AstNode | undefined): AstNode | undefined {
  // oxc wraps a concise arrow object body `() => ({...})` in a
  // ParenthesizedExpression; peel it (and any nesting) before checking shape.
  let current = node;
  while (current?.type === 'ParenthesizedExpression') {
    current = current.expression as AstNode | undefined;
  }
  return current;
}

function isFreshLiteral(node: AstNode | undefined): boolean {
  const inner = unwrap(node);
  return (
    inner?.type === 'ArrayExpression' || inner?.type === 'ObjectExpression'
  );
}

function getterReturnsFreshLiteral(fn: AstNode): boolean {
  const body = fn.body as AstNode;
  // Concise arrow body: `() => [a, b]` or `() => ({ a })`.
  if (body.type !== 'BlockStatement') return isFreshLiteral(body);
  // Block body: the getter's identity is its first top-level return. A return
  // nested inside an inner function is that function's, not this getter's.
  for (const stmt of body.body as AstNode[]) {
    if (stmt.type === 'ReturnStatement') {
      return isFreshLiteral(stmt.argument as AstNode | undefined);
    }
  }
  return false;
}

export const noFreshDepsInWatch = defineRule({
  create(context: RuleContext) {
    return {
      CallExpression(node: AstNode) {
        const callee = node.callee as AstNode | undefined;
        if (callee?.type !== 'Identifier' || callee.name !== 'watch') return;
        const source = (node.arguments as AstNode[])[0];
        if (!source || !isFunction(source)) return;
        if (getterReturnsFreshLiteral(source)) {
          context.report({ node: source, message: MESSAGE });
        }
      },
    };
  },
});
