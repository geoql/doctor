import type { AstNode } from '../types.js';

/** Receivers that expose the native browser/runtime globals. */
const GLOBAL_NAMESPACES = new Set(['globalThis', 'window', 'self', 'global']);

/**
 * Returns `name` when `node` is a bare `name` identifier or a non-computed
 * `<globalThis|window|self|global>.name` member, i.e. a reference that
 * resolves to the native global rather than an arbitrary object's method.
 */
export function nativeGlobalName(
  node: AstNode | undefined,
): string | undefined {
  if (node?.type === 'Identifier') return node.name as string;
  if (node?.type !== 'MemberExpression' || node.computed === true) {
    return undefined;
  }
  const object = node.object as AstNode;
  if (
    object.type !== 'Identifier' ||
    !GLOBAL_NAMESPACES.has(object.name as string)
  ) {
    return undefined;
  }
  return (node.property as AstNode).name as string;
}
