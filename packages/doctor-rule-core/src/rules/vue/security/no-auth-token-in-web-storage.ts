import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL =
  'https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html#local-storage';
const MESSAGE = `Persisting auth tokens/secrets in localStorage or sessionStorage exposes them to any XSS payload. Store them in an HttpOnly, Secure, SameSite cookie set by the server instead. See ${DOCS_URL}`;

const STORAGES = new Set(['localStorage', 'sessionStorage']);
const SENSITIVE_KEY =
  /token|jwt|secret|password|passwd|credential|api[-_]?key|bearer|private[-_]?key|auth/i;

function stringValue(node: AstNode | undefined): string | undefined {
  if (node?.type === 'Literal' && typeof node.value === 'string') {
    return node.value;
  }
  return undefined;
}

function isStorageObject(node: AstNode | undefined): boolean {
  return node?.type === 'Identifier' && STORAGES.has(node.name as string);
}

function memberKey(node: AstNode): string | undefined {
  const property = node.property as AstNode;
  if (node.computed === true) return stringValue(property);
  return property.name as string;
}

export const noAuthTokenInWebStorage = defineRule({
  create(context: RuleContext) {
    return {
      CallExpression(node: AstNode) {
        const callee = node.callee as AstNode;
        if (callee.type !== 'MemberExpression') return;
        if (callee.computed === true) return;
        if (!isStorageObject(callee.object as AstNode | undefined)) return;
        const method = callee.property as AstNode;
        if (method.name !== 'setItem') return;
        const key = stringValue((node.arguments as AstNode[])[0]);
        if (key !== undefined && SENSITIVE_KEY.test(key)) {
          context.report({ node, message: MESSAGE });
        }
      },
      AssignmentExpression(node: AstNode) {
        const left = node.left as AstNode;
        if (left.type !== 'MemberExpression') return;
        if (!isStorageObject(left.object as AstNode | undefined)) return;
        const key = memberKey(left);
        if (key !== undefined && SENSITIVE_KEY.test(key)) {
          context.report({ node, message: MESSAGE });
        }
      },
    };
  },
});
