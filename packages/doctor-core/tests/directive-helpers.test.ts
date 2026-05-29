import type { ElementNode } from '@vue/compiler-core';
import { describe, expect, it } from 'vitest';
import {
  findBindAttr,
  findDirective,
  findStaticAttr,
} from '../src/template/directive-helpers.js';

function el(props: unknown[]): ElementNode {
  return { props } as unknown as ElementNode;
}

const NODE_ATTR = 6;
const NODE_DIRECTIVE = 7;

describe('findDirective', () => {
  it('finds a directive by name and returns undefined otherwise', () => {
    const dir = { type: NODE_DIRECTIVE, name: 'for' };
    const node = el([dir, { type: NODE_ATTR, name: 'class' }]);
    expect(findDirective(node, 'for')).toBe(dir);
    expect(findDirective(node, 'if')).toBeUndefined();
  });
});

describe('findBindAttr', () => {
  it('matches a v-bind whose arg content equals the attribute name', () => {
    const bind = {
      type: NODE_DIRECTIVE,
      name: 'bind',
      arg: { content: 'key' },
    };
    expect(findBindAttr(el([bind]), 'key')).toBe(bind);
  });

  it('returns undefined for a v-bind on a different attribute', () => {
    const bind = {
      type: NODE_DIRECTIVE,
      name: 'bind',
      arg: { content: 'class' },
    };
    expect(findBindAttr(el([bind]), 'key')).toBeUndefined();
  });

  it('ignores non-bind directives and non-directive props', () => {
    const node = el([
      { type: NODE_DIRECTIVE, name: 'for' },
      { type: NODE_ATTR, name: 'key' },
    ]);
    expect(findBindAttr(node, 'key')).toBeUndefined();
  });
});

describe('findStaticAttr', () => {
  it('finds a static attribute and ignores directives', () => {
    const attr = { type: NODE_ATTR, name: 'key' };
    const node = el([{ type: NODE_DIRECTIVE, name: 'bind' }, attr]);
    expect(findStaticAttr(node, 'key')).toBe(attr);
    expect(findStaticAttr(node, 'id')).toBeUndefined();
  });
});
