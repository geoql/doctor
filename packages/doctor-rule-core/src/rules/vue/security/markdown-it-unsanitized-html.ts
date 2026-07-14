import { defineRule } from '../../../define-rule.js';
import type { AstNode, RuleContext } from '../../../types.js';

const DOCS_URL =
  'https://github.com/markdown-it/markdown-it/blob/master/docs/security.md';
const MESSAGE = `markdown-it is configured with \`html: true\` but no sanitizer is connected. Raw HTML in user-authored markdown is an XSS vector. Pipe md.render output through DOMPurify/sanitize-html, or add a markdown-it sanitizer plugin. See ${DOCS_URL}`;

// Modules whose presence proves the author sanitizes the rendered HTML.
const SANITIZER_MODULES = new Set([
  'dompurify',
  'isomorphic-dompurify',
  'sanitize-html',
  'xss',
  'markdown-it-sanitizer',
  'insane',
]);

function importSource(node: AstNode): string {
  // An ImportDeclaration's source is always a string literal in valid ESM.
  return String((node.source as AstNode).value);
}

// True when the options object literal contains `html: true` (a boolean literal).
function optsEnableHtml(node: AstNode | undefined): boolean {
  if (!node || node.type !== 'ObjectExpression') return false;
  for (const prop of node.properties as AstNode[]) {
    if (prop.type !== 'Property') continue;
    const key = prop.key as AstNode;
    const keyName =
      key.type === 'Identifier'
        ? (key.name as string)
        : key.type === 'Literal'
          ? String(key.value)
          : undefined;
    if (keyName !== 'html') continue;
    const value = prop.value as AstNode;
    return value.type === 'Literal' && value.value === true;
  }
  return false;
}

function isMarkdownItCallee(
  callee: AstNode | undefined,
  local: string,
): boolean {
  return callee?.type === 'Identifier' && callee.name === local;
}

export const markdownItUnsanitizedHtml = defineRule({
  create(context: RuleContext) {
    let markdownItLocal: string | undefined;
    let sanitized = false;
    const unsafeSites: AstNode[] = [];
    const markdownInstances = new Set<string>();

    const recordConstruction = (
      node: AstNode,
      calleeArgs: AstNode[] | undefined,
      assignedTo: string | undefined,
    ): void => {
      if (assignedTo) markdownInstances.add(assignedTo);
      if (optsEnableHtml(calleeArgs?.[0])) unsafeSites.push(node);
    };

    return {
      ImportDeclaration(node: AstNode): void {
        const source = importSource(node);
        if (SANITIZER_MODULES.has(source)) sanitized = true;
        if (source === 'markdown-it') {
          for (const spec of node.specifiers as AstNode[]) {
            if (spec.type === 'ImportDefaultSpecifier') {
              markdownItLocal = (spec.local as AstNode).name as string;
            }
          }
        }
      },
      VariableDeclarator(node: AstNode): void {
        if (markdownItLocal === undefined) return;
        const init = node.init as AstNode | undefined;
        const id = node.id as AstNode;
        const assignedTo =
          id.type === 'Identifier' ? (id.name as string) : undefined;
        if (
          init?.type === 'NewExpression' &&
          isMarkdownItCallee(init.callee as AstNode, markdownItLocal)
        ) {
          recordConstruction(
            init,
            init.arguments as AstNode[] | undefined,
            assignedTo,
          );
        } else if (
          init?.type === 'CallExpression' &&
          isMarkdownItCallee(init.callee as AstNode, markdownItLocal)
        ) {
          recordConstruction(
            init,
            init.arguments as AstNode[] | undefined,
            assignedTo,
          );
        }
      },
      CallExpression(node: AstNode): void {
        const callee = node.callee as AstNode | undefined;
        if (callee?.type !== 'MemberExpression') return;
        const prop = callee.property as AstNode;
        const propName = prop.type === 'Identifier' ? prop.name : undefined;
        if (propName === 'use') {
          sanitized = true;
          return;
        }
        if (propName !== 'set') return;
        const object = callee.object as AstNode;
        if (
          object.type === 'Identifier' &&
          markdownInstances.has(object.name as string) &&
          optsEnableHtml((node.arguments as AstNode[] | undefined)?.[0])
        ) {
          unsafeSites.push(node);
        }
      },
      'Program:exit'(): void {
        if (sanitized) return;
        for (const site of unsafeSites) {
          context.report({ node: site, message: MESSAGE });
        }
      },
    };
  },
});
