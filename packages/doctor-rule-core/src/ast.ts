import type { AstNode } from './types.js';

/**
 * Keys present on an oxc/ESTree node that hold bookkeeping data rather than
 * child nodes.
 *
 * `parent` is a back-reference injected by the linter adapter (and the test
 * harness). Following it while scanning a subtree escapes the subtree, climbs
 * to `Program`, and then descends into every sibling statement — turning an
 * "is X inside this node" check into "does this file contain X anywhere".
 * That was the root cause of #234.
 *
 * Ascending via `node.parent` is fine when it is deliberate (e.g. finding the
 * enclosing statement); it must never happen inside a subtree scan.
 */
export const AST_SKIP_KEYS: ReadonlySet<string> = new Set([
  'type',
  'loc',
  'start',
  'end',
  'range',
  'parent',
]);

/**
 * Invoke `visit` for every direct child AST node of `node`.
 *
 * Never follows `parent` back-references and never revisits bookkeeping keys.
 * Use this instead of hand-rolling an `Object.keys(node)` loop: the manual
 * version is what allowed `parent` to leak into subtree scans.
 */
export function eachChild(
  node: AstNode,
  visit: (child: AstNode) => void,
): void {
  for (const key of Object.keys(node)) {
    if (AST_SKIP_KEYS.has(key)) continue;
    const value = (node as Record<string, unknown>)[key];
    if (Array.isArray(value)) {
      for (const child of value) {
        if (child && typeof child === 'object' && 'type' in child) {
          visit(child as AstNode);
        }
      }
    } else if (value && typeof value === 'object' && 'type' in value) {
      visit(value as AstNode);
    }
  }
}
