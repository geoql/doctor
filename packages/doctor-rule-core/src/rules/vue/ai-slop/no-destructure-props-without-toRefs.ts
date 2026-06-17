import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL =
  'https://vuejs.org/guide/components/props.html#reactive-props-destructure';
const MESSAGE = `Destructuring props loses reactivity. Wrap with toRefs(...) to keep refs. See ${DOCS_URL}`;

function calleeName(node: AstNode): string | undefined {
  const callee = node.callee as AstNode | undefined;
  if (callee?.type === 'Identifier') return callee.name as string;
  return undefined;
}

function isDefinePropsCall(node: AstNode | undefined): boolean {
  if (!node || node.type !== 'CallExpression') return false;
  const name = calleeName(node);
  if (name === 'defineProps') return true;
  if (name === 'withDefaults') {
    const args = node.arguments as AstNode[] | undefined;
    return isDefinePropsCall(args?.[0]);
  }
  return false;
}

function isToRefsCall(node: AstNode | undefined): boolean {
  return node?.type === 'CallExpression' && calleeName(node) === 'toRefs';
}

export const noDestructurePropsWithoutToRefs = defineRule({
  create(context: RuleContext) {
    const propsSources = new Set<string>();

    function registerSetupParam(fn: AstNode | undefined): void {
      const params = fn?.params as AstNode[] | undefined;
      const first = params?.[0];
      if (first?.type === 'Identifier') propsSources.add(first.name as string);
    }

    return {
      VariableDeclarator(node: AstNode) {
        const id = node.id as AstNode;
        const init = node.init as AstNode | undefined;
        if (id.type === 'Identifier' && isDefinePropsCall(init)) {
          propsSources.add(id.name as string);
          return;
        }
        if (id.type !== 'ObjectPattern' || !init) return;
        if (isToRefsCall(init)) return;
        const fromProps =
          isDefinePropsCall(init) ||
          (init.type === 'Identifier' && propsSources.has(init.name as string));
        if (fromProps) context.report({ node, message: MESSAGE });
      },
      Property(node: AstNode) {
        const key = node.key as AstNode | undefined;
        if (key?.type === 'Identifier' && key.name === 'setup') {
          registerSetupParam(node.value as AstNode);
        }
      },
    };
  },
});
