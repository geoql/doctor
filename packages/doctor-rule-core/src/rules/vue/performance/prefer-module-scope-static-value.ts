import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL = 'https://vuejs.org/guide/best-practices/performance.html';
const MESSAGE = `This static array or object literal is declared inside a function, so a fresh copy is allocated on every call (including every component instantiation). Hoist it to module scope so the single frozen reference is shared. See ${DOCS_URL}`;

const LITERAL_TYPES = new Set([
  'Literal',
  'StringLiteral',
  'NumericLiteral',
  'BooleanLiteral',
  'NullLiteral',
  'BigIntLiteral',
  'TemplateLiteral',
]);

function isStaticLiteral(node: AstNode | undefined): boolean {
  if (!node) return false;
  if (LITERAL_TYPES.has(node.type)) {
    if (node.type === 'TemplateLiteral') {
      return (node.expressions as AstNode[]).length === 0;
    }
    return true;
  }
  if (node.type === 'UnaryExpression') {
    return isStaticLiteral(node.argument as AstNode);
  }
  if (node.type === 'ArrayExpression') {
    const elements = node.elements as (AstNode | null)[];
    return (
      elements.length > 0 &&
      elements.every((el) => isStaticLiteral(el ?? undefined))
    );
  }
  if (node.type === 'ObjectExpression') {
    const props = node.properties as AstNode[];
    if (props.length === 0) return false;
    return props.every((p) => {
      if (p.type !== 'Property' || p.computed === true) return false;
      return isStaticLiteral(p.value as AstNode);
    });
  }
  return false;
}

function isHoistableSize(node: AstNode): boolean {
  // Caller guarantees node is an Array/Object expression.
  if (node.type === 'ArrayExpression') {
    return (node.elements as unknown[]).length > 1;
  }
  return (node.properties as unknown[]).length > 0;
}

export const preferModuleScopeStaticValue = defineRule({
  create(context: RuleContext) {
    let functionDepth = 0;

    return {
      ArrowFunctionExpression(): void {
        functionDepth += 1;
      },
      'ArrowFunctionExpression:exit'(): void {
        functionDepth -= 1;
      },
      FunctionExpression(): void {
        functionDepth += 1;
      },
      'FunctionExpression:exit'(): void {
        functionDepth -= 1;
      },
      FunctionDeclaration(): void {
        functionDepth += 1;
      },
      'FunctionDeclaration:exit'(): void {
        functionDepth -= 1;
      },
      VariableDeclarator(node: AstNode): void {
        if (functionDepth === 0) return;
        const init = node.init as AstNode | undefined;
        if (!init) return;
        if (
          init.type !== 'ArrayExpression' &&
          init.type !== 'ObjectExpression'
        ) {
          return;
        }
        if (!isHoistableSize(init)) return;
        if (!isStaticLiteral(init)) return;
        context.report({ node: init, message: MESSAGE });
      },
    };
  },
});
