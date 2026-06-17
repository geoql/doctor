import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL = 'https://nuxt.com/docs/4.x/guide/components';
const MESSAGE = `Accessing window./document./navigator./localStorage./sessionStorage. without an import.meta.client or process.client guard causes SSR failures. Wrap with if (import.meta.client) { ... } or move to onMounted. See ${DOCS_URL}`;

const BROWSER_GLOBALS = new Set([
  'window',
  'document',
  'navigator',
  'localStorage',
  'sessionStorage',
]);

function isImportMetaClientGuard(node: AstNode | undefined): boolean {
  if (!node || node.type !== 'MemberExpression') return false;
  const obj = node.object as AstNode | undefined;
  if (obj?.type !== 'MetaProperty') return false;
  const meta = obj.meta as AstNode | undefined;
  const prop = obj.property as AstNode | undefined;
  if (meta?.type !== 'Identifier') return false;
  if ((meta as AstNode & { name: string }).name !== 'import') return false;
  if (prop?.type !== 'Identifier') return false;
  if ((prop as AstNode & { name: string }).name !== 'meta') return false;
  const property = node.property as AstNode | undefined;
  if (property?.type !== 'Identifier') return false;
  return (property as AstNode & { name: string }).name === 'client';
}

function isProcessClientGuard(node: AstNode | undefined): boolean {
  if (!node || node.type !== 'MemberExpression') return false;
  const obj = node.object as AstNode | undefined;
  if (obj?.type !== 'Identifier') return false;
  if ((obj as AstNode & { name: string }).name !== 'process') return false;
  const property = node.property as AstNode | undefined;
  if (property?.type !== 'Identifier') return false;
  return (property as AstNode & { name: string }).name === 'client';
}

export const clientOnlyForBrowserApis = defineRule({
  create(context: RuleContext) {
    const functionDepthStack: number[] = [];
    let isGuarded = false;

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
      IfStatement(node: AstNode) {
        if (functionDepthStack.length > 0) return;
        const test = node.test as AstNode | undefined;
        if (isImportMetaClientGuard(test) || isProcessClientGuard(test)) {
          isGuarded = true;
        }
      },
      'IfStatement:exit'(node: AstNode) {
        if (functionDepthStack.length > 0) return;
        const test = node.test as AstNode | undefined;
        if (isImportMetaClientGuard(test) || isProcessClientGuard(test)) {
          isGuarded = false;
        }
      },
      MemberExpression(node: AstNode) {
        if (functionDepthStack.length > 0) return;
        if (isGuarded) return;
        const obj = node.object as AstNode | undefined;
        if (obj?.type !== 'Identifier') return;
        if (!BROWSER_GLOBALS.has(obj.name as string)) return;
        context.report({ node, message: MESSAGE });
      },
    };
  },
});
