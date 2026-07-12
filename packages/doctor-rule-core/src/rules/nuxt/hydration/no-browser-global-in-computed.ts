import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL = 'https://nuxt.com/docs/4.x/getting-started/data-fetching';
const MESSAGE = `Reading a browser global inside a computed getter runs during SSR (computeds evaluate on the server render) and throws or hydration-mismatches. Guard with import.meta.client or derive the value in onMounted. See ${DOCS_URL}`;

const BROWSER_GLOBALS = new Set([
  'window',
  'document',
  'navigator',
  'localStorage',
  'sessionStorage',
]);

function calleeIdentifierName(node: AstNode): string | undefined {
  const callee = node.callee as AstNode | undefined;
  if (callee?.type === 'Identifier') return callee.name as string;
  return undefined;
}

function isImportMetaClient(node: AstNode): boolean {
  if (node.type !== 'MemberExpression') return false;
  const object = node.object as AstNode | undefined;
  if (object?.type !== 'MetaProperty') return false;
  const property = node.property as AstNode | undefined;
  return (
    property?.type === 'Identifier' && (property.name as string) === 'client'
  );
}

interface ComputedFrame {
  sourceCall: AstNode;
  guardDepth: number;
}

export const noBrowserGlobalInComputed = defineRule({
  create(context: RuleContext) {
    const computedStack: ComputedFrame[] = [];

    return {
      CallExpression(node: AstNode) {
        if (calleeIdentifierName(node) === 'computed') {
          computedStack.push({ sourceCall: node, guardDepth: 0 });
        }
      },
      'CallExpression:exit'(node: AstNode) {
        const top = computedStack[computedStack.length - 1];
        if (top?.sourceCall === node) computedStack.pop();
      },
      IfStatement(node: AstNode) {
        const top = computedStack[computedStack.length - 1];
        if (top && isImportMetaClient(node.test as AstNode)) {
          top.guardDepth += 1;
        }
      },
      'IfStatement:exit'(node: AstNode) {
        const top = computedStack[computedStack.length - 1];
        if (top && isImportMetaClient(node.test as AstNode)) {
          top.guardDepth -= 1;
        }
      },
      ConditionalExpression(node: AstNode) {
        const top = computedStack[computedStack.length - 1];
        if (top && isImportMetaClient(node.test as AstNode)) {
          top.guardDepth += 1;
        }
      },
      'ConditionalExpression:exit'(node: AstNode) {
        const top = computedStack[computedStack.length - 1];
        if (top && isImportMetaClient(node.test as AstNode)) {
          top.guardDepth -= 1;
        }
      },
      MemberExpression(node: AstNode) {
        const top = computedStack[computedStack.length - 1];
        if (!top || top.guardDepth > 0) return;
        const object = node.object as AstNode | undefined;
        if (object?.type !== 'Identifier') return;
        if (!BROWSER_GLOBALS.has(object.name as string)) return;
        context.report({ node, message: MESSAGE });
      },
    };
  },
});
