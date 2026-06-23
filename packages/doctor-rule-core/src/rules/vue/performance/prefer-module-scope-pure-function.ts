import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL = 'https://vuejs.org/guide/best-practices/performance.html';
const MESSAGE = `This helper closes over nothing reactive (only its parameters, imports, and globals), yet it is re-created on every call of the enclosing function. Hoist it to module scope so a single function reference is shared across all component instances. See ${DOCS_URL}`;

const GLOBALS = new Set([
  'console',
  'Math',
  'JSON',
  'Object',
  'Array',
  'Number',
  'String',
  'Boolean',
  'Date',
  'RegExp',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'Promise',
  'Symbol',
  'BigInt',
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
  'encodeURIComponent',
  'decodeURIComponent',
  'structuredClone',
  'undefined',
  'NaN',
  'Infinity',
  'globalThis',
]);

const SKIP_KEYS = new Set(['type', 'loc', 'start', 'end', 'range', 'parent']);

function eachChild(node: AstNode, visit: (child: AstNode) => void): void {
  for (const key of Object.keys(node)) {
    if (SKIP_KEYS.has(key)) continue;
    const value = (node as Record<string, unknown>)[key];
    if (Array.isArray(value)) {
      for (const c of value) {
        if (c && typeof c === 'object' && 'type' in c) visit(c as AstNode);
      }
    } else if (value && typeof value === 'object' && 'type' in value) {
      visit(value as AstNode);
    }
  }
}

function collectPatternNames(pattern: AstNode, into: Set<string>): void {
  switch (pattern.type) {
    case 'Identifier':
      into.add(pattern.name as string);
      return;
    case 'AssignmentPattern':
      collectPatternNames(pattern.left as AstNode, into);
      return;
    case 'RestElement':
      collectPatternNames(pattern.argument as AstNode, into);
      return;
    case 'ArrayPattern':
      for (const el of pattern.elements as (AstNode | null)[]) {
        if (el) collectPatternNames(el, into);
      }
      return;
    case 'ObjectPattern':
      for (const prop of pattern.properties as AstNode[]) {
        if (prop.type === 'RestElement') {
          collectPatternNames(prop.argument as AstNode, into);
        } else {
          collectPatternNames(prop.value as AstNode, into);
        }
      }
      return;
  }
}

function collectBound(fn: AstNode, bound: Set<string>): void {
  for (const param of fn.params as AstNode[]) {
    collectPatternNames(param, bound);
  }
  if (fn.id && (fn.id as AstNode).type === 'Identifier') {
    bound.add((fn.id as AstNode).name as string);
  }
  const walk = (node: AstNode): void => {
    if (node.type === 'VariableDeclarator') {
      collectPatternNames(node.id as AstNode, bound);
    } else if (node.type === 'FunctionDeclaration' && node.id) {
      bound.add((node.id as AstNode).name as string);
    } else if (
      (node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression') &&
      node !== fn
    ) {
      for (const p of node.params as AstNode[]) {
        collectPatternNames(p, bound);
      }
    }
    eachChild(node, walk);
  };
  eachChild(fn, walk);
}

function collectFree(fn: AstNode, free: Set<string>): void {
  const visit = (node: AstNode, parent: AstNode | null, key: string): void => {
    if (node.type === 'Identifier') {
      const isMemberProp =
        parent?.type === 'MemberExpression' &&
        key === 'property' &&
        parent.computed !== true;
      const isPropKey =
        parent?.type === 'Property' &&
        key === 'key' &&
        parent.computed !== true;
      if (!isMemberProp && !isPropKey) free.add(node.name as string);
      return;
    }
    for (const k of Object.keys(node)) {
      if (SKIP_KEYS.has(k)) continue;
      const value = (node as Record<string, unknown>)[k];
      if (Array.isArray(value)) {
        for (const c of value) {
          if (c && typeof c === 'object' && 'type' in c) {
            visit(c as AstNode, node, k);
          }
        }
      } else if (value && typeof value === 'object' && 'type' in value) {
        visit(value as AstNode, node, k);
      }
    }
  };
  for (const stmt of bodyNodes(fn)) visit(stmt, fn, 'body');
}

function bodyNodes(fn: AstNode): AstNode[] {
  const body = fn.body as AstNode;
  if (body.type === 'BlockStatement') return body.body as AstNode[];
  return [body];
}

function isHoistable(fn: AstNode, imports: Set<string>): boolean {
  const bound = new Set<string>();
  collectBound(fn, bound);
  const free = new Set<string>();
  collectFree(fn, free);
  for (const name of free) {
    if (bound.has(name)) continue;
    if (imports.has(name)) continue;
    if (GLOBALS.has(name)) continue;
    return false;
  }
  return true;
}

export const preferModuleScopePureFunction = defineRule({
  create(context: RuleContext) {
    const imports = new Set<string>();
    let functionDepth = 0;

    const enter = (): void => {
      functionDepth += 1;
    };
    const exit = (): void => {
      functionDepth -= 1;
    };

    const analyze = (fn: AstNode): void => {
      if (functionDepth < 1) return;
      if (isHoistable(fn, imports)) {
        context.report({ node: fn, message: MESSAGE });
      }
    };

    return {
      ImportDeclaration(node: AstNode): void {
        for (const spec of node.specifiers as AstNode[]) {
          const local = spec.local as AstNode;
          imports.add(local.name as string);
        }
      },
      VariableDeclaration(node: AstNode): void {
        if (functionDepth < 1) return;
        if (node.kind !== 'const') return;
        for (const decl of node.declarations as AstNode[]) {
          const init = decl.init as AstNode | undefined;
          if (
            init?.type === 'ArrowFunctionExpression' ||
            init?.type === 'FunctionExpression'
          ) {
            if (isHoistable(init, imports)) {
              context.report({ node: init, message: MESSAGE });
            }
          }
        }
      },
      FunctionDeclaration(node: AstNode): void {
        analyze(node);
        enter();
      },
      'FunctionDeclaration:exit'(): void {
        exit();
      },
      ArrowFunctionExpression: enter,
      'ArrowFunctionExpression:exit': exit,
      FunctionExpression: enter,
      'FunctionExpression:exit': exit,
    };
  },
});
