import type {
  AttributeNode,
  DirectiveNode,
  ElementNode,
} from '@vue/compiler-core';

const NODE_DIRECTIVE = 7;

export function findDirective(
  el: ElementNode,
  name: string,
): DirectiveNode | undefined {
  for (const prop of el.props) {
    if (prop.type === NODE_DIRECTIVE && prop.name === name)
      return prop as DirectiveNode;
  }
  return undefined;
}

export function findBindAttr(
  el: ElementNode,
  attrName: string,
): DirectiveNode | undefined {
  for (const prop of el.props) {
    if (prop.type !== NODE_DIRECTIVE) continue;
    const dir = prop as DirectiveNode;
    if (dir.name !== 'bind') continue;
    const arg = dir.arg as { content?: string } | undefined;
    if (arg?.content === attrName) return dir;
  }
  return undefined;
}

export function findStaticAttr(
  el: ElementNode,
  attrName: string,
): AttributeNode | undefined {
  for (const prop of el.props) {
    if (prop.type === 6 && (prop as AttributeNode).name === attrName) {
      return prop as AttributeNode;
    }
  }
  return undefined;
}
