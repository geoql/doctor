import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL =
  'https://owasp.org/www-community/attacks/Server_Side_Request_Forgery';
const MESSAGE = `Building a useFetch/$fetch URL from user input (route.query/route.params) lets an attacker control the request target — an SSRF risk during SSR. Use a fixed path and pass user input via the query/body options instead. See ${DOCS_URL}`;

const FETCH_CALLEES = new Set([
  'useFetch',
  'useLazyFetch',
  'useAsyncData',
  'useLazyAsyncData',
  '$fetch',
]);

const USER_INPUT_ROOTS = new Set(['route', 'useRoute']);
const USER_INPUT_SEGMENTS = new Set(['query', 'params']);

function calleeName(node: AstNode): string | undefined {
  const callee = node.callee as AstNode | undefined;
  if (callee?.type === 'Identifier') return callee.name as string;
  return undefined;
}

/** True when the expression reads from route.query.* or route.params.*. */
function readsUserInput(node: AstNode): boolean {
  if (node.type !== 'MemberExpression') return false;
  const object = node.object as AstNode;
  const property = node.property as AstNode;
  if (
    object.type === 'Identifier' &&
    USER_INPUT_ROOTS.has(object.name as string) &&
    property.type === 'Identifier' &&
    USER_INPUT_SEGMENTS.has(property.name as string)
  ) {
    return true;
  }
  return readsUserInput(object);
}

function templateReadsUserInput(node: AstNode): boolean {
  const expressions = node.expressions as AstNode[];
  return expressions.some((expr) => readsUserInput(expr));
}

function urlArgIsTainted(arg: AstNode | undefined): boolean {
  if (!arg) return false;
  if (arg.type === 'TemplateLiteral') return templateReadsUserInput(arg);
  if (arg.type === 'MemberExpression') return readsUserInput(arg);
  return false;
}

export const noUserInputInFetchUrl = defineRule({
  create(context: RuleContext) {
    return {
      CallExpression(node: AstNode) {
        const name = calleeName(node);
        if (name === undefined || !FETCH_CALLEES.has(name)) return;
        const urlArg = (node.arguments as AstNode[])[0];
        if (urlArgIsTainted(urlArg)) {
          context.report({ node, message: MESSAGE });
        }
      },
    };
  },
});
