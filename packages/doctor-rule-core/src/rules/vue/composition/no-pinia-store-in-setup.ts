import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL = 'https://pinia.vuejs.org/core-concepts/#defining-a-store';
const MESSAGE = `This calls defineStore() inside a function (setup, a composable, or a component body), so a brand-new store definition is created on every call instead of one shared singleton. Call defineStore() once at module scope and call the returned useXxxStore() inside setup. See ${DOCS_URL}`;

export const noPiniaStoreInSetup = defineRule({
  create(context: RuleContext) {
    let functionDepth = 0;

    const enter = (): void => {
      functionDepth += 1;
    };
    const exit = (): void => {
      functionDepth -= 1;
    };

    return {
      CallExpression(node: AstNode) {
        const callee = node.callee as AstNode | undefined;
        if (callee?.type !== 'Identifier' || callee.name !== 'defineStore') {
          return;
        }
        if (functionDepth > 0) {
          context.report({ node, message: MESSAGE });
        }
      },
      FunctionDeclaration: enter,
      'FunctionDeclaration:exit': exit,
      FunctionExpression: enter,
      'FunctionExpression:exit': exit,
      ArrowFunctionExpression: enter,
      'ArrowFunctionExpression:exit': exit,
    };
  },
});
