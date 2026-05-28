import type {
  ElementNode,
  RootNode,
  TemplateChildNode,
} from '@vue/compiler-core';

const NODE_ELEMENT = 1;

export function isElementNode(
  node: { type: number } | undefined | null,
): node is ElementNode {
  return node !== null && node !== undefined && node.type === NODE_ELEMENT;
}

export type ElementVisitor = (node: ElementNode) => void;

export function walkElements(root: RootNode, visit: ElementVisitor): void {
  const stack: TemplateChildNode[] = [...root.children];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    if (isElementNode(node)) {
      visit(node);
      if (node.children) {
        for (const child of node.children) stack.push(child);
      }
    }
  }
}
