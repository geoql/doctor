import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL =
  'https://vuejs.org/guide/essentials/watchers.html#side-effect-cleanup';
const MESSAGE = `This cleanup cannot detach the listener it pairs with: removeEventListener only removes when the handler reference AND capture flag match addEventListener exactly. Use the same named handler (never an inline arrow) and the same capture flag. See ${DOCS_URL}`;

// Effect scopes whose add/remove listener pairs must match.
const EFFECT_CALLS = new Set([
  'watch',
  'watchEffect',
  'onMounted',
  'onBeforeUnmount',
  'onUnmounted',
]);

interface ListenerRecord {
  event: string;
  handlerKey: string | undefined; // undefined = inline fn (unremovable ref)
  capture: string;
  node: AstNode;
}

interface EffectFrame {
  sourceCall: AstNode;
  added: ListenerRecord[];
  removed: ListenerRecord[];
}

function calleeIdentifierName(node: AstNode): string | undefined {
  const callee = node.callee as AstNode | undefined;
  if (callee?.type === 'Identifier') return callee.name as string;
  return undefined;
}

function calledMethodName(node: AstNode): string | undefined {
  const callee = node.callee as AstNode | undefined;
  if (callee?.type === 'MemberExpression' && callee.computed !== true) {
    const property = callee.property as AstNode;
    return property.name as string;
  }
  return undefined;
}

function literalString(node: AstNode | undefined): string | undefined {
  if (node?.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }
  return undefined;
}

function handlerKey(node: AstNode | undefined): string | undefined {
  if (node?.type === 'Identifier') return node.name as string;
  if (node?.type === 'MemberExpression' && node.computed !== true) {
    const object = handlerKey(node.object as AstNode | undefined);
    if (object === undefined) return undefined;
    const property = node.property as AstNode;
    return `${object}.${property.name as string}`;
  }
  return undefined;
}

function captureKey(node: AstNode | undefined): string {
  if (node === undefined) return 'false';
  if (node.type === 'Literal') return String(node.value);
  if (node.type === 'ObjectExpression') {
    const props = node.properties as AstNode[];
    for (const prop of props) {
      const key = prop.key as AstNode | undefined;
      if (key?.type === 'Identifier' && (key.name as string) === 'capture') {
        return String((prop.value as AstNode | undefined)?.value ?? 'unknown');
      }
    }
    return 'false';
  }
  return 'unknown';
}

function toRecord(node: AstNode): ListenerRecord | undefined {
  const args = node.arguments as AstNode[];
  const event = literalString(args[0]);
  if (event === undefined) return undefined;
  return {
    event,
    handlerKey: handlerKey(args[1]),
    capture: captureKey(args[2]),
    node,
  };
}

function reportMismatches(context: RuleContext, frame: EffectFrame): void {
  for (const removed of frame.removed) {
    const pairable = frame.added.filter((a) => a.event === removed.event);
    if (pairable.length === 0) continue;
    const matches = pairable.some(
      (a) =>
        a.handlerKey !== undefined &&
        a.handlerKey === removed.handlerKey &&
        a.capture === removed.capture,
    );
    if (!matches) {
      context.report({ node: removed.node, message: MESSAGE });
    }
  }
}

export const effectListenerCleanupMismatch = defineRule({
  create(context: RuleContext) {
    const stack: EffectFrame[] = [];

    return {
      CallExpression(node: AstNode) {
        const name = calleeIdentifierName(node);
        if (name !== undefined && EFFECT_CALLS.has(name)) {
          stack.push({ sourceCall: node, added: [], removed: [] });
          return;
        }
        if (stack.length === 0) return;
        const method = calledMethodName(node);
        if (method === 'addEventListener') {
          const record = toRecord(node);
          if (record) stack[stack.length - 1]!.added.push(record);
        } else if (method === 'removeEventListener') {
          const record = toRecord(node);
          if (record) stack[stack.length - 1]!.removed.push(record);
        }
      },
      'CallExpression:exit'(node: AstNode) {
        if (stack.length === 0) return;
        const top = stack[stack.length - 1]!;
        if (top.sourceCall !== node) return;
        stack.pop();
        // Nested effect frames (onUnmounted inside onMounted) fold their
        // listener records into the parent so add/remove pairs registered
        // across the mount/unmount boundary can still be matched.
        const parent = stack[stack.length - 1];
        if (parent) {
          parent.added.push(...top.added);
          parent.removed.push(...top.removed);
          return;
        }
        reportMismatches(context, top);
      },
    };
  },
});
