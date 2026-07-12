import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL = 'https://vuejs.org/guide/essentials/reactivity-fundamentals';
const MESSAGE = `clearTimeout/clearInterval on a ref leaves the stale timer id in .value, so any "timer pending" check on that ref keeps passing after the timer is gone. Reset the ref (e.g. timer.value = null) after clearing. See ${DOCS_URL}`;

const CLEAR_CALLS = new Set(['clearTimeout', 'clearInterval']);

interface PendingClear {
  refName: string;
  node: AstNode;
}

// Per-function frame: pending clears not yet followed by a `.value` reset.
interface ScopeFrame {
  owner: AstNode | null;
  pending: PendingClear[];
}

/** Matches `<identifier>.value` and returns the identifier name. */
function refValueTarget(node: AstNode | undefined): string | undefined {
  if (node?.type !== 'MemberExpression' || node.computed === true) {
    return undefined;
  }
  const object = node.object as AstNode | undefined;
  const property = node.property as AstNode | undefined;
  if (object?.type !== 'Identifier' || property?.type !== 'Identifier') {
    return undefined;
  }
  if ((property.name as string) !== 'value') return undefined;
  return object.name as string;
}

function flush(context: RuleContext, frame: ScopeFrame): void {
  for (const item of frame.pending) {
    context.report({ node: item.node, message: MESSAGE });
  }
}

export const noStaleTimerRef = defineRule({
  create(context: RuleContext) {
    const frames: ScopeFrame[] = [{ owner: null, pending: [] }];
    const top = (): ScopeFrame => frames[frames.length - 1]!;

    const enterFunction = (node: AstNode): void => {
      frames.push({ owner: node, pending: [] });
    };
    const exitFunction = (): void => {
      flush(context, frames.pop()!);
    };

    return {
      FunctionDeclaration: enterFunction,
      'FunctionDeclaration:exit': exitFunction,
      FunctionExpression: enterFunction,
      'FunctionExpression:exit': exitFunction,
      ArrowFunctionExpression: enterFunction,
      'ArrowFunctionExpression:exit': exitFunction,
      CallExpression(node: AstNode) {
        const callee = node.callee as AstNode | undefined;
        if (
          callee?.type !== 'Identifier' ||
          !CLEAR_CALLS.has(callee.name as string)
        ) {
          return;
        }
        const args = node.arguments as AstNode[];
        const refName = refValueTarget(args[0]);
        if (refName === undefined) return;
        top().pending.push({ refName, node });
      },
      AssignmentExpression(node: AstNode) {
        const refName = refValueTarget(node.left as AstNode | undefined);
        if (refName === undefined) return;
        const frame = top();
        frame.pending = frame.pending.filter((p) => p.refName !== refName);
      },
      'Program:exit'() {
        flush(context, frames[0]!);
      },
    };
  },
});
