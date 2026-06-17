import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL = 'https://nuxt.com/docs/4.x/guide/components';
const MESSAGE = `Accessing document/window/navigator/localStorage at the top level of <script setup> causes a server-side crash (SSR). These browser globals are undefined on the server. Move access inside onMounted or guard with import.meta.client. See ${DOCS_URL}`;

const SSR_UNSAFE_GLOBALS = new Set([
  'document',
  'window',
  'navigator',
  'localStorage',
  'sessionStorage',
]);

export const noDocumentInSetup = defineRule({
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
      Identifier(node: AstNode) {
        if (functionDepthStack.length > 0) return;
        if (SSR_UNSAFE_GLOBALS.has(node.name as string)) {
          context.report({ node, message: MESSAGE });
        }
      },
    };
  },
});
