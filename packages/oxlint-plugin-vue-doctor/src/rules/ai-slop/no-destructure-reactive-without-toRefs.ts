import { defineRule } from '../../define-rule.js';
import type { AstNode, RuleContext } from '../../rule-types.js';

const DOCS_URL =
  'https://vuejs.org/guide/essentials/reactivity-fundamentals.html#destructuring-reactive-state';
const MESSAGE = `Destructuring reactive state loses reactivity. Wrap with toRefs(...) or read single keys via toRef(state, 'key'). See ${DOCS_URL}`;

const REACTIVE_FACTORIES = new Set(['reactive', 'shallowReactive']);

function calleeName(node: AstNode): string | undefined {
  const callee = node.callee as AstNode | undefined;
  if (callee?.type === 'Identifier') return callee.name as string;
  return undefined;
}

function isReactiveCall(node: AstNode | undefined): boolean {
  if (!node || node.type !== 'CallExpression') return false;
  const name = calleeName(node);
  if (name && REACTIVE_FACTORIES.has(name)) return true;
  if (name === 'readonly') {
    const args = node.arguments as AstNode[] | undefined;
    return isReactiveCall(args?.[0]);
  }
  return false;
}

function isToRefsCall(node: AstNode | undefined): boolean {
  return node?.type === 'CallExpression' && calleeName(node) === 'toRefs';
}

export const noDestructureReactiveWithoutToRefs = defineRule({
  create(context: RuleContext) {
    const reactiveSources = new Set<string>();
    return {
      VariableDeclarator(node: AstNode) {
        const id = node.id as AstNode;
        const init = node.init as AstNode | undefined;
        if (id.type === 'Identifier' && isReactiveCall(init)) {
          reactiveSources.add(id.name as string);
          return;
        }
        if (id.type !== 'ObjectPattern' || !init) return;
        if (isToRefsCall(init)) return;
        const fromReactive =
          isReactiveCall(init) ||
          (init.type === 'Identifier' &&
            reactiveSources.has(init.name as string));
        if (fromReactive) context.report({ node, message: MESSAGE });
      },
    };
  },
});
