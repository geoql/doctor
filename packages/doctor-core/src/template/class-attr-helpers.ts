import type {
  AttributeNode,
  DirectiveNode,
  ElementNode,
} from '@vue/compiler-core';

const NODE_ATTRIBUTE = 6;
const NODE_DIRECTIVE = 7;

export interface AttrLoc {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

export interface AttrSource {
  /** The raw text to scan (class string body or bound-class expression text). */
  text: string;
  loc: AttrLoc;
}

/**
 * Collect the scannable text of every `class` source on an element: the static
 * `class="..."` value and any bound `:class` expression source. Bound
 * expressions are returned verbatim so a regex can match string-literal class
 * fragments inside ternaries, arrays, and objects without a full JS parse.
 */
export function collectClassSources(el: ElementNode): AttrSource[] {
  const sources: AttrSource[] = [];
  for (const prop of el.props) {
    if (prop.type === NODE_ATTRIBUTE) {
      const attr = prop as AttributeNode;
      if (attr.name === 'class' && attr.value) {
        sources.push({ text: attr.value.content, loc: attr.loc });
      }
    }
    if (prop.type === NODE_DIRECTIVE) {
      const dir = prop as DirectiveNode;
      if (
        dir.name === 'bind' &&
        dir.arg &&
        'content' in dir.arg &&
        dir.arg.content === 'class' &&
        dir.exp &&
        'content' in dir.exp
      ) {
        sources.push({ text: dir.exp.content as string, loc: dir.loc });
      }
    }
  }
  return sources;
}

/** Find a static `style="..."` attribute on an element, if present. */
export function findStaticStyle(el: ElementNode): AttributeNode | undefined {
  for (const prop of el.props) {
    if (
      prop.type === NODE_ATTRIBUTE &&
      (prop as AttributeNode).name === 'style'
    ) {
      return prop as AttributeNode;
    }
  }
  return undefined;
}
