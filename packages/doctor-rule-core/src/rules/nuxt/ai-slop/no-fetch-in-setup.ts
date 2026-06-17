import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL = 'https://nuxt.com/docs/4.x/guide/data-fetching';
const MESSAGE = `Bare $fetch/fetch at the top level of <script setup> runs on both server and client without SSR deduplication. Use useFetch for automatic request deduplication and SSR hydration. See ${DOCS_URL}`;

function isFetchCall(node: AstNode | undefined): boolean {
  if (!node || node.type !== 'CallExpression') return false;
  const callee = node.callee as AstNode | undefined;
  if (callee?.type === 'Identifier') {
    const name = callee.name as string;
    return name === '$fetch' || name === 'fetch';
  }
  return false;
}

export const noFetchInSetup = defineRule({
  create(context: RuleContext) {
    const functionDepthStack: number[] = [];

    return {
      ArrowFunctionExpression() {
        functionDepthStack.push(
          functionDepthStack.length > 0
            ? functionDepthStack[functionDepthStack.length - 1]! + 1
            : 1,
        );
      },
      'ArrowFunctionExpression:exit'() {
        functionDepthStack.pop();
      },
      FunctionExpression() {
        functionDepthStack.push(
          functionDepthStack.length > 0
            ? functionDepthStack[functionDepthStack.length - 1]! + 1
            : 1,
        );
      },
      'FunctionExpression:exit'() {
        functionDepthStack.pop();
      },
      FunctionDeclaration() {
        functionDepthStack.push(
          functionDepthStack.length > 0
            ? functionDepthStack[functionDepthStack.length - 1]! + 1
            : 1,
        );
      },
      'FunctionDeclaration:exit'() {
        functionDepthStack.pop();
      },
      CallExpression(node: AstNode) {
        if (functionDepthStack.length > 0) return;
        if (!isFetchCall(node)) return;
        const parent = (node as Record<string, unknown>)['parent'] as
          | AstNode
          | undefined;
        if (parent?.type === 'AwaitExpression') return;
        context.report({ node, message: MESSAGE });
      },
      AwaitExpression(node: AstNode) {
        if (functionDepthStack.length > 0) return;
        if (!isFetchCall(node.argument as AstNode | undefined)) return;
        context.report({ node, message: MESSAGE });
      },
    };
  },
});
