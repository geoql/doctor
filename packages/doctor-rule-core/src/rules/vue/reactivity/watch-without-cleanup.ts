import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL =
  'https://vuejs.org/guide/essentials/watchers.html#side-effect-cleanup';
const MESSAGE =
  "This watcher registers a listener, timer, or observer but never cleans it up, so it leaks across re-runs and hot reloads. Register cleanup with onWatcherCleanup (or the callback's onCleanup argument) inside the watcher. See " +
  DOCS_URL;
const MESSAGE_EFFECT =
  'This watcher registers a listener, timer, or observer but never cleans it up, so it leaks across re-runs and hot reloads. Return a cleanup function (or call onWatcherCleanup) inside the watcher. See ' +
  DOCS_URL;

const REGISTER_CALLS = new Set([
  'addEventListener',
  'setInterval',
  'setTimeout',
]);
const RETAINED_RESOURCE_CONSTRUCTORS = new Set([
  'IntersectionObserver',
  'MutationObserver',
  'ResizeObserver',
  'PerformanceObserver',
  'WebSocket',
  'EventSource',
  'BroadcastChannel',
  'RTCPeerConnection',
]);
const CLEANUP_CALLS = new Set(['onCleanup', 'onWatcherCleanup']);

interface WatchFrame {
  sourceCall: AstNode;
  isEffect: boolean;
  hasRegistration: boolean;
  hasCleanup: boolean;
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

export const watchWithoutCleanup = defineRule({
  create(context: RuleContext) {
    const watchStack: WatchFrame[] = [];

    return {
      CallExpression(node: AstNode) {
        const name = calleeIdentifierName(node);
        if (name === 'watch' || name === 'watchEffect') {
          const isEffect = name === 'watchEffect';
          const args = node.arguments as AstNode[];
          const callback = args[isEffect ? 0 : 1];
          if (!isFunction(callback)) return;
          watchStack.push({
            sourceCall: node,
            isEffect,
            hasRegistration: false,
            hasCleanup: false,
          });
          return;
        }
        if (watchStack.length === 0) return;
        const top = watchStack[watchStack.length - 1]!;
        const method = calledMethodName(node);
        if (method !== undefined && REGISTER_CALLS.has(method)) {
          top.hasRegistration = true;
        }
        // onCleanup (the watch callback's third argument) and onWatcherCleanup
        // are valid cleanup registration in BOTH watch and watchEffect
        // callbacks - the isEffect gate previously rejected the watch() forms,
        // leaving the only accepted pattern the return-a-function form Vue
        // ignores for watch() (geoql/doctor#179).
        if (method !== undefined && CLEANUP_CALLS.has(method)) {
          top.hasCleanup = true;
        }
      },
      NewExpression(node: AstNode) {
        if (watchStack.length === 0) return;
        const callee = node.callee as AstNode | undefined;
        if (
          callee?.type === 'Identifier' &&
          RETAINED_RESOURCE_CONSTRUCTORS.has(callee.name as string)
        ) {
          watchStack[watchStack.length - 1]!.hasRegistration = true;
        }
      },
      ReturnStatement(node: AstNode) {
        if (watchStack.length === 0) return;
        // Returning a function is cleanup ONLY for watchEffect - Vue ignores
        // a returned function from a watch() callback, so crediting it there
        // accepted the one pattern that actually leaks (geoql/doctor#179).
        const top = watchStack[watchStack.length - 1]!;
        if (top.isEffect && isFunction(node.argument as AstNode | undefined)) {
          top.hasCleanup = true;
        }
      },
      'CallExpression:exit'(node: AstNode) {
        if (watchStack.length === 0) return;
        const top = watchStack[watchStack.length - 1]!;
        if (top.sourceCall !== node) return;
        watchStack.pop();
        if (top.hasRegistration && !top.hasCleanup) {
          context.report({
            node,
            message: top.isEffect ? MESSAGE_EFFECT : MESSAGE,
          });
        }
      },
    };
  },
});
