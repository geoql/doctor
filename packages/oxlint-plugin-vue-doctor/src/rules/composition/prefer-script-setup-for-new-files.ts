import { defineRule } from '../../define-rule.js';
import type { AstNode, RuleContext } from '../../rule-types.js';

const DOCS_URL = 'https://vuejs.org/api/sfc-script-setup.html';
const MESSAGE = `This component nests composition-API logic inside an options-object setup(). Use a <script setup> block instead — it removes the setup() boilerplate and exposes bindings to the template directly. See ${DOCS_URL}`;

function isFunctionValue(node: AstNode | undefined): boolean {
  return (
    node?.type === 'ArrowFunctionExpression' ||
    node?.type === 'FunctionExpression'
  );
}

function isSetupProperty(prop: AstNode): boolean {
  if (prop.type !== 'Property' || prop.computed === true) return false;
  if (prop.shorthand === true) return false;
  const key = prop.key as AstNode;
  if (key.type !== 'Identifier' || key.name !== 'setup') return false;
  return isFunctionValue(prop.value as AstNode | undefined);
}

export const preferScriptSetupForNewFiles = defineRule({
  create(context: RuleContext) {
    return {
      ExportDefaultDeclaration(node: AstNode) {
        const declaration = node.declaration as AstNode | undefined;
        if (declaration?.type !== 'ObjectExpression') return;
        const properties = declaration.properties as AstNode[];
        if (properties.some(isSetupProperty)) {
          context.report({ node, message: MESSAGE });
        }
      },
    };
  },
});
