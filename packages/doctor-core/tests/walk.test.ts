import type { ElementNode, RootNode } from '@vue/compiler-core';
import { describe, expect, it } from 'vitest';
import { isElementNode, walkElements } from '../src/template/walk.js';

describe('isElementNode', () => {
  it('returns false for null and undefined', () => {
    expect(isElementNode(null)).toBe(false);
    expect(isElementNode(undefined)).toBe(false);
  });

  it('returns true only for type === 1 (element)', () => {
    expect(isElementNode({ type: 1 })).toBe(true);
    expect(isElementNode({ type: 2 })).toBe(false);
  });
});

describe('walkElements', () => {
  it('visits each element and recurses into children', () => {
    const child = { type: 1, children: [] } as unknown as ElementNode;
    const parent = { type: 1, children: [child] } as unknown as ElementNode;
    const root = { children: [parent] } as unknown as RootNode;
    const visited: ElementNode[] = [];
    walkElements(root, (el) => visited.push(el));
    expect(visited).toContain(parent);
    expect(visited).toContain(child);
    expect(visited).toHaveLength(2);
  });

  it('skips non-element children and elements without a children array', () => {
    const elementNoChildren = { type: 1 } as unknown as ElementNode;
    const textNode = { type: 2 } as unknown;
    const root = {
      children: [elementNoChildren, textNode],
    } as unknown as RootNode;
    const visited: ElementNode[] = [];
    walkElements(root, (el) => visited.push(el));
    expect(visited).toEqual([elementNoChildren]);
  });

  it('skips falsy entries popped from the stack', () => {
    const root = { children: [null, undefined] } as unknown as RootNode;
    const visited: ElementNode[] = [];
    walkElements(root, (el) => visited.push(el));
    expect(visited).toEqual([]);
  });
});
