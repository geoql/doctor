import type { AstNode } from '../types.js';

// Literal replacements that neutralise `<` once inserted into HTML. Note the
// JS value: `'\\u003c'` in source is the six-character text `\u003c`, which
// JSON-parses back to `<` but can never open a tag. `'\u003c'` is just `<`.
const SAFE_LT_REPLACEMENTS = new Set(['\\u003c', '\\u003C', '&lt;']);

function memberName(node: AstNode, object: string, property: string): boolean {
  if (node.type !== 'MemberExpression' || node.computed === true) return false;
  const target = node.object as AstNode;
  return (
    target.type === 'Identifier' &&
    (target.name as string) === object &&
    ((node.property as AstNode).name as string) === property
  );
}

function isJsonStringifyCall(node: AstNode): boolean {
  return (
    node.type === 'CallExpression' &&
    memberName(node.callee as AstNode, 'JSON', 'stringify')
  );
}

/** `/</g` for `.replace`; `/</g` or `'<'` for `.replaceAll`. */
function matchesEveryLt(node: AstNode | undefined, method: string): boolean {
  if (node?.type !== 'Literal') return false;
  const regex = node.regex as { pattern: string; flags: string } | undefined;
  if (regex) return regex.pattern === '<' && regex.flags.includes('g');
  return method === 'replaceAll' && node.value === '<';
}

/** Returns the receiver when `node` is `<receiver>.replace|replaceAll(...)`. */
function replaceReceiver(node: AstNode): AstNode | undefined {
  if (node.type !== 'CallExpression') return undefined;
  const callee = node.callee as AstNode;
  if (callee.type !== 'MemberExpression' || callee.computed === true) {
    return undefined;
  }
  const method = (callee.property as AstNode).name as string;
  if (method !== 'replace' && method !== 'replaceAll') return undefined;
  return callee.object as AstNode;
}

function escapesLt(node: AstNode): boolean {
  const callee = node.callee as AstNode;
  const method = (callee.property as AstNode).name as string;
  const [pattern, replacement] = node.arguments as AstNode[];
  return (
    matchesEveryLt(pattern, method) &&
    replacement?.type === 'Literal' &&
    typeof replacement.value === 'string' &&
    SAFE_LT_REPLACEMENTS.has(replacement.value)
  );
}

/**
 * True for `JSON.stringify(x)` followed by a `.replace`/`.replaceAll` chain
 * where at least one link escapes every `<` (react.doctor #2011). Such output
 * contains no `<`, so it cannot open a tag or close a `<script>`.
 */
export function isEscapedJsonStringify(node: AstNode): boolean {
  let current = node;
  let escaped = false;
  let receiver = replaceReceiver(current);
  while (receiver !== undefined) {
    if (escapesLt(current)) escaped = true;
    current = receiver;
    receiver = replaceReceiver(current);
  }
  return escaped && isJsonStringifyCall(current);
}
