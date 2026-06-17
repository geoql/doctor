import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL = 'https://vuejs.org/api/reactivity-advanced.html#shallowref';
const MESSAGE = `This ref holds large or fetched data, so deep reactivity tracks every nested property and wastes memory and CPU. Use shallowRef() (and triggerRef on replacement) for large arrays, big objects, or server payloads. See ${DOCS_URL}`;

const ARRAY_LIMIT = 100;
const OBJECT_LIMIT = 50;
const FETCH_IDENTIFIERS = new Set(['$fetch', 'useFetch']);

function calleeName(node: AstNode): string | undefined {
  const callee = node.callee as AstNode | undefined;
  if (callee?.type === 'Identifier') return callee.name as string;
  return undefined;
}

function isAxiosGet(node: AstNode): boolean {
  const callee = node.callee as AstNode | undefined;
  if (callee?.type !== 'MemberExpression' || callee.computed === true) {
    return false;
  }
  const object = callee.object as AstNode;
  const property = callee.property as AstNode;
  return (
    object.type === 'Identifier' &&
    object.name === 'axios' &&
    property.name === 'get'
  );
}

function isFetchSource(node: AstNode): boolean {
  if (node.type !== 'CallExpression') return false;
  const name = calleeName(node);
  if (name !== undefined && FETCH_IDENTIFIERS.has(name)) return true;
  return isAxiosGet(node);
}

function isLargeData(node: AstNode | undefined): boolean {
  if (!node) return false;
  const value =
    node.type === 'AwaitExpression' ? (node.argument as AstNode) : node;
  if (value.type === 'ArrayExpression') {
    return (value.elements as AstNode[]).length > ARRAY_LIMIT;
  }
  if (value.type === 'ObjectExpression') {
    return (value.properties as AstNode[]).length > OBJECT_LIMIT;
  }
  return isFetchSource(value);
}

export const preferShallowRefForLargeData = defineRule({
  create(context: RuleContext) {
    return {
      CallExpression(node: AstNode) {
        if (calleeName(node) !== 'ref') return;
        const init = (node.arguments as AstNode[])[0];
        if (isLargeData(init)) context.report({ node, message: MESSAGE });
      },
    };
  },
});
