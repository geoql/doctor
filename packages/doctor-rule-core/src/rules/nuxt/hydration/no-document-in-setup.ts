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

const TYPE_PARENT_TYPES = new Set([
  'TSInterfaceBody',
  'TSTypeLiteral',
  'TSPropertySignature',
  'TSTypeAnnotation',
  'TSTypeReference',
]);

function isInsideTypeContext(node: AstNode): boolean {
  let current: AstNode | undefined = node.parent;
  while (current) {
    if (TYPE_PARENT_TYPES.has(current.type)) return true;
    current = current.parent;
  }
  return false;
}

function isImportMetaClientExpression(node: AstNode): boolean {
  if (node.type !== 'MemberExpression') return false;
  if ((node.property as { name?: string }).name !== 'client') return false;
  const object = node.object as AstNode;
  return (
    object.type === 'MetaProperty' &&
    (object as { meta?: { name?: string } }).meta?.name === 'import' &&
    (object as { property?: { name?: string } }).property?.name === 'meta'
  );
}

function containsImportMetaClient(node: AstNode): boolean {
  if (isImportMetaClientExpression(node)) return true;
  for (const key of Object.keys(node)) {
    if (key === 'parent' || key === 'loc') continue;
    const value = node[key];
    const children = Array.isArray(value) ? value : [value];
    for (const child of children) {
      if (child && typeof child === 'object' && (child as AstNode).type) {
        if (containsImportMetaClient(child as AstNode)) return true;
      }
    }
  }
  return false;
}

function isGuardedByImportMetaClient(node: AstNode): boolean {
  let current: AstNode | undefined = node.parent;
  while (current) {
    if (
      current.type === 'IfStatement' ||
      current.type === 'ConditionalExpression'
    ) {
      const test = (current as { test?: AstNode }).test;
      if (test && containsImportMetaClient(test)) return true;
    }
    current = current.parent;
  }
  return false;
}

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
        if (!SSR_UNSAFE_GLOBALS.has(node.name as string)) return;
        if (isInsideTypeContext(node)) return;
        if (isGuardedByImportMetaClient(node)) return;
        context.report({ node, message: MESSAGE });
      },
    };
  },
});
