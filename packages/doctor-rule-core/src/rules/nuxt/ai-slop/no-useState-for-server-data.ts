import { eachChild } from '../../../ast.js';
import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL = 'https://nuxt.com/docs/4.x/guide/data-fetching';
const MESSAGE = `useState with a fetch/await initializer suggests useFetch or useAsyncData for automatic SSR hydration and request deduplication. See ${DOCS_URL}`;

function containsFetchOrAwait(node: AstNode): boolean {
  if (node.type === 'AwaitExpression') return true;
  if (node.type === 'CallExpression') {
    const callee = node.callee as AstNode | undefined;
    if (callee?.type === 'Identifier') {
      const name = callee.name as string;
      if (name === '$fetch' || name === 'fetch') return true;
    }
  }
  // eachChild never follows `parent`, so this stays inside the initializer's
  // own subtree instead of climbing to Program and scanning sibling
  // statements (#234). A subtree is a tree, so no visited-set is needed.
  let found = false;
  eachChild(node, (child) => {
    if (!found && containsFetchOrAwait(child)) found = true;
  });
  return found;
}

export const noUseStateForServerData = defineRule({
  create(context: RuleContext) {
    return {
      CallExpression(node: AstNode) {
        const callee = node.callee as AstNode | undefined;
        if (callee?.type !== 'Identifier') return;
        if ((callee as AstNode & { name: string }).name !== 'useState') return;
        const args = node.arguments as AstNode[];
        if (args.length < 2) return;
        const initFn = args[1];
        if (
          initFn.type !== 'ArrowFunctionExpression' &&
          initFn.type !== 'FunctionExpression'
        )
          return;
        if (!containsFetchOrAwait(initFn.body as AstNode)) return;
        context.report({ node, message: MESSAGE });
      },
    };
  },
});
