import { defineRule } from '../../define-rule.js';
import type { AstNode, RuleContext } from '../../rule-types.js';

const DOCS_URL =
  'https://vuejs.org/guide/components/provide-inject.html#working-with-reactivity';
const MESSAGE = `Mutating an injected value from a consumer breaks one-way data flow and makes the source of changes hard to trace. Wrap the provided value in readonly() at the provide site and expose a dedicated mutator instead. See ${DOCS_URL}`;

const MUTATING_METHODS = new Set([
  'push',
  'pop',
  'splice',
  'shift',
  'unshift',
  'sort',
  'reverse',
]);

function calleeName(node: AstNode): string | undefined {
  const callee = node.callee as AstNode | undefined;
  if (callee?.type === 'Identifier') return callee.name as string;
  return undefined;
}

function memberObjectName(node: AstNode | undefined): string | undefined {
  if (!node || node.type !== 'MemberExpression') return undefined;
  const object = node.object as AstNode;
  if (object.type !== 'Identifier') return undefined;
  return object.name as string;
}

export const preferReadonlyForInjected = defineRule({
  create(context: RuleContext) {
    const injectedSources = new Set<string>();
    return {
      VariableDeclarator(node: AstNode) {
        const id = node.id as AstNode;
        const init = node.init as AstNode | undefined;
        if (
          id.type === 'Identifier' &&
          init?.type === 'CallExpression' &&
          calleeName(init) === 'inject'
        ) {
          injectedSources.add(id.name as string);
        }
      },
      AssignmentExpression(node: AstNode) {
        const name = memberObjectName(node.left as AstNode);
        if (name !== undefined && injectedSources.has(name)) {
          context.report({ node, message: MESSAGE });
        }
      },
      CallExpression(node: AstNode) {
        const callee = node.callee as AstNode | undefined;
        if (callee?.type !== 'MemberExpression' || callee.computed === true) {
          return;
        }
        const name = memberObjectName(callee);
        if (name === undefined || !injectedSources.has(name)) return;
        const property = callee.property as AstNode;
        if (MUTATING_METHODS.has(property.name as string)) {
          context.report({ node, message: MESSAGE });
        }
      },
    };
  },
});
