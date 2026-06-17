import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL =
  'https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML#security_considerations';
const MESSAGE = `Assigning to innerHTML/outerHTML injects unsanitized markup and is a DOM-based XSS sink. Use textContent for text, or sanitize with DOMPurify before assigning. See ${DOCS_URL}`;

const HTML_SINKS = new Set(['innerHTML', 'outerHTML']);

function isHtmlSinkTarget(node: AstNode): boolean {
  if (node.type !== 'MemberExpression') return false;
  if (node.computed === true) return false;
  const property = node.property as AstNode;
  return (
    property.type === 'Identifier' && HTML_SINKS.has(property.name as string)
  );
}

export const noInnerHtml = defineRule({
  create(context: RuleContext) {
    return {
      AssignmentExpression(node: AstNode) {
        if (!isHtmlSinkTarget(node.left as AstNode)) return;
        context.report({ node, message: MESSAGE });
      },
    };
  },
});
