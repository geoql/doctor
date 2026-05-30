import { defineRule } from '../../define-rule.js';
import type { AstNode, RuleContext } from '../../rule-types.js';

const DOCS_URL =
  'https://vuejs.org/guide/essentials/watchers.html#side-effect-cleanup';
const MESSAGE = `This watcher registers a listener, timer, or observer but never cleans it up, so it leaks across re-runs and hot reloads. Return a cleanup function (or call onWatcherCleanup) inside the watcher. See ${DOCS_URL}`;

const REGISTER_CALLS = new Set([
  'addEventListener',
  'setInterval',
  'setTimeout',
]);
const OBSERVERS = new Set([
  'IntersectionObserver',
  'MutationObserver',
  'ResizeObserver',
]);
const CLEANUP_CALLS = new Set(['onCleanup', 'onWatcherCleanup']);
const SKIP_KEYS = new Set(['type', 'start', 'end']);

function isNode(value: unknown): value is AstNode {
  return typeof value === 'object' && value !== null;
}

function calleeIdentifierName(node: AstNode): string | undefined {
  const callee = node.callee as AstNode | undefined;
  if (callee?.type === 'Identifier') return callee.name as string;
  return undefined;
}

function calledMethodName(node: AstNode): string | undefined {
  const callee = node.callee as AstNode | undefined;
  if (callee?.type === 'Identifier') return callee.name as string;
  if (callee?.type === 'MemberExpression' && callee.computed !== true) {
    const property = callee.property as AstNode;
    return property.name as string;
  }
  return undefined;
}

function isFunction(node: AstNode | undefined): boolean {
  return (
    node?.type === 'ArrowFunctionExpression' ||
    node?.type === 'FunctionExpression'
  );
}

function isRegistration(node: AstNode): boolean {
  if (node.type === 'NewExpression') {
    const callee = node.callee as AstNode | undefined;
    return (
      callee?.type === 'Identifier' && OBSERVERS.has(callee.name as string)
    );
  }
  if (node.type === 'CallExpression') {
    const name = calledMethodName(node);
    return name !== undefined && REGISTER_CALLS.has(name);
  }
  return false;
}

function returnsCleanup(node: AstNode): boolean {
  return (
    node.type === 'ReturnStatement' &&
    isFunction(node.argument as AstNode | undefined)
  );
}

function isCleanupCall(node: AstNode): boolean {
  if (node.type !== 'CallExpression') return false;
  const name = calledMethodName(node);
  return name !== undefined && CLEANUP_CALLS.has(name);
}

function collect(node: AstNode, out: AstNode[]): void {
  out.push(node);
  for (const key of Object.keys(node)) {
    if (SKIP_KEYS.has(key)) continue;
    const value = (node as Record<string, unknown>)[key];
    const children = Array.isArray(value) ? value : [value];
    for (const child of children) {
      if (isNode(child)) collect(child, out);
    }
  }
}

export const watchWithoutCleanup = defineRule({
  create(context: RuleContext) {
    return {
      CallExpression(node: AstNode) {
        const name = calleeIdentifierName(node);
        if (name !== 'watch' && name !== 'watchEffect') return;
        const isEffect = name === 'watchEffect';
        const args = node.arguments as AstNode[];
        const callback = args[isEffect ? 0 : 1];
        if (!isFunction(callback)) return;
        const nodes: AstNode[] = [];
        collect(callback.body as AstNode, nodes);
        if (!nodes.some(isRegistration)) return;
        const hasCleanup =
          nodes.some(returnsCleanup) || (isEffect && nodes.some(isCleanupCall));
        if (hasCleanup) return;
        context.report({ node, message: MESSAGE });
      },
    };
  },
});
