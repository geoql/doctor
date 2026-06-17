import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL = 'https://nuxt.com/docs/4.x/guide/data-fetching';
const MESSAGE = `useState with a fetch/await initializer suggests useFetch or useAsyncData for automatic SSR hydration and request deduplication. See ${DOCS_URL}`;

function containsFetchOrAwait(
  node: AstNode | undefined,
  visited: Set<unknown>,
): boolean {
  if (!node || visited.has(node)) return false;
  visited.add(node);
  if (node.type === 'AwaitExpression') return true;
  if (node.type === 'CallExpression') {
    const callee = node.callee as AstNode | undefined;
    if (callee?.type === 'Identifier') {
      const name = callee.name as string;
      if (name === '$fetch' || name === 'fetch') return true;
    }
  }
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'loc' || key === 'range') continue;
    const value = (node as Record<string, unknown>)[key];
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof child === 'object' && 'type' in child) {
          if (containsFetchOrAwait(child as AstNode, visited)) return true;
        }
      }
    } else if (value && typeof value === 'object' && 'type' in value) {
      if (containsFetchOrAwait(value as AstNode, visited)) return true;
    }
  }
  return false;
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
        if (!containsFetchOrAwait(initFn.body as AstNode, new Set())) return;
        context.report({ node, message: MESSAGE });
      },
    };
  },
});
