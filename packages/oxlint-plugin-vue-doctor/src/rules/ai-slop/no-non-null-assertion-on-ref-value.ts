import { defineRule } from '../../define-rule.js';
import type { AstNode, RuleContext } from '../../rule-types.js';

const DOCS_URL =
  'https://vuejs.org/guide/typescript/composition-api.html#typing-ref';
const MESSAGE = `Non-null assertion on a ref's .value hides nullability. Add an explicit guard ('if (!r.value) return') or use optional chaining ('r.value?.x'). See ${DOCS_URL}`;

const REF_FACTORIES = new Set([
  'ref',
  'shallowRef',
  'customRef',
  'computed',
  'useTemplateRef',
]);

function calleeName(node: AstNode): string | undefined {
  const callee = node.callee as AstNode | undefined;
  if (callee?.type === 'Identifier') return callee.name as string;
  return undefined;
}

function isRefFactoryCall(node: AstNode | undefined): boolean {
  if (!node || node.type !== 'CallExpression') return false;
  const name = calleeName(node);
  return name !== undefined && REF_FACTORIES.has(name);
}

function isDotValue(node: AstNode | undefined): node is AstNode {
  if (!node || node.type !== 'MemberExpression') return false;
  const property = node.property as AstNode | undefined;
  return (
    node.computed !== true &&
    property?.type === 'Identifier' &&
    property.name === 'value'
  );
}

export const noNonNullAssertionOnRefValue = defineRule({
  create(context: RuleContext) {
    const refSources = new Set<string>();
    return {
      VariableDeclarator(node: AstNode) {
        const id = node.id as AstNode;
        if (
          id.type === 'Identifier' &&
          isRefFactoryCall(node.init as AstNode)
        ) {
          refSources.add(id.name as string);
        }
      },
      TSNonNullExpression(node: AstNode) {
        const arg = node.expression as AstNode | undefined;
        if (!isDotValue(arg)) return;
        const object = arg.object as AstNode | undefined;
        if (object?.type !== 'Identifier') return;
        if (!refSources.has(object.name as string)) return;
        context.report({ node, message: MESSAGE });
      },
    };
  },
});
