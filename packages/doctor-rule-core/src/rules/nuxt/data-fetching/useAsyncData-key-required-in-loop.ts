import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL = 'https://nuxt.com/docs/4.x/guide/data-fetching';
const MESSAGE = `useAsyncData/useFetch without an explicit string key inside a loop causes duplicate requests and cache fragmentation. Pass a unique string key as the first argument. See ${DOCS_URL}`;

const DATA_FETCHERS = new Set(['useAsyncData', 'useFetch']);

function isMapCall(node: AstNode): boolean {
  const callee = node.callee as AstNode | undefined;
  if (callee?.type === 'Identifier') return callee.name === 'map';
  if (callee?.type === 'MemberExpression') {
    const prop = (callee as AstNode & { property?: AstNode }).property as
      | AstNode
      | undefined;
    return (
      prop?.type === 'Identifier' &&
      (prop as AstNode & { name: string }).name === 'map'
    );
  }
  return false;
}

export const useAsyncDataKeyRequiredInLoop = defineRule({
  create(context: RuleContext) {
    let loopDepth = 0;

    return {
      ForStatement() {
        loopDepth++;
      },
      'ForStatement:exit'() {
        loopDepth--;
      },
      ForOfStatement() {
        loopDepth++;
      },
      'ForOfStatement:exit'() {
        loopDepth--;
      },
      ForInStatement() {
        loopDepth++;
      },
      'ForInStatement:exit'() {
        loopDepth--;
      },
      WhileStatement() {
        loopDepth++;
      },
      'WhileStatement:exit'() {
        loopDepth--;
      },
      CallExpression(node: AstNode) {
        if (isMapCall(node)) {
          loopDepth++;
          return;
        }
        if (loopDepth === 0) return;
        const callee = node.callee as AstNode | undefined;
        if (callee?.type !== 'Identifier') return;
        if (!DATA_FETCHERS.has(callee.name as string)) return;
        const args = node.arguments as AstNode[];
        if (args.length === 0) return;
        const firstArg = args[0];
        if (firstArg.type === 'Literal' && typeof firstArg.value === 'string')
          return;
        context.report({ node, message: MESSAGE });
      },
      'CallExpression:exit'(node: AstNode) {
        if (isMapCall(node)) {
          loopDepth--;
        }
      },
    };
  },
});
