import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL = 'https://vuejs.org/guide/components/events.html';
const MESSAGE = `Calling a parent callback prop during setup or inside a computed getter runs a side effect on the render path — it fires on every re-evaluation and during SSR. Move the call into an event handler, watcher, or lifecycle hook. See ${DOCS_URL}`;

const CALLBACK_NAME = /^on[A-Z]/;

interface FunctionFrame {
  node: AstNode;
  isComputedGetter: boolean;
}

function calleeIdentifierName(node: AstNode): string | undefined {
  const callee = node.callee as AstNode | undefined;
  if (callee?.type === 'Identifier') return callee.name as string;
  return undefined;
}

function isComputedGetter(fn: AstNode): boolean {
  const parent = fn.parent as AstNode | undefined;
  if (parent?.type !== 'CallExpression') return false;
  return calleeIdentifierName(parent) === 'computed';
}

function definePropsBinding(node: AstNode): string | undefined {
  let call = node.init as AstNode | undefined;
  if (
    call?.type === 'CallExpression' &&
    calleeIdentifierName(call) === 'withDefaults'
  ) {
    call = (call.arguments as AstNode[])[0];
  }
  if (
    call?.type !== 'CallExpression' ||
    calleeIdentifierName(call) !== 'defineProps'
  ) {
    return undefined;
  }
  const id = node.id as AstNode | undefined;
  if (id?.type !== 'Identifier') return undefined;
  return id.name as string;
}

export const noPropCallbackInSetup = defineRule({
  create(context: RuleContext) {
    const propsNames = new Set<string>();
    const functionStack: FunctionFrame[] = [];

    const enterFunction = (node: AstNode): void => {
      functionStack.push({ node, isComputedGetter: isComputedGetter(node) });
    };
    const exitFunction = (): void => {
      functionStack.pop();
    };

    return {
      VariableDeclarator(node: AstNode) {
        const name = definePropsBinding(node);
        if (name !== undefined) propsNames.add(name);
      },
      FunctionDeclaration: enterFunction,
      'FunctionDeclaration:exit': exitFunction,
      FunctionExpression: enterFunction,
      'FunctionExpression:exit': exitFunction,
      ArrowFunctionExpression: enterFunction,
      'ArrowFunctionExpression:exit': exitFunction,
      CallExpression(node: AstNode) {
        const callee = node.callee as AstNode | undefined;
        if (callee?.type !== 'MemberExpression' || callee.computed === true) {
          return;
        }
        const object = callee.object as AstNode | undefined;
        const property = callee.property as AstNode | undefined;
        if (object?.type !== 'Identifier' || property?.type !== 'Identifier') {
          return;
        }
        if (!propsNames.has(object.name as string)) return;
        if (!CALLBACK_NAME.test(property.name as string)) return;

        const enclosing = functionStack[functionStack.length - 1];
        const onRenderPath =
          enclosing === undefined || enclosing.isComputedGetter;
        if (onRenderPath) {
          context.report({ node, message: MESSAGE });
        }
      },
    };
  },
});
