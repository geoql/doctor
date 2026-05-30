import type {
  ElementNode,
  RootNode,
  TemplateChildNode,
} from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

const NODE_DIRECTIVE = 7;

function checkElement(
  el: ElementNode,
  inVForSubtree: boolean,
  ctx: TemplateRuleContext,
  diagnostics: Diagnostic[],
): void {
  const isVFor = el.props.some(
    (p) => p.type === NODE_DIRECTIVE && (p as { name?: string }).name === 'for',
  );

  const effectiveInVFor = inVForSubtree || isVFor;

  if (effectiveInVFor) {
    for (const prop of el.props) {
      if (prop.type !== NODE_DIRECTIVE) continue;
      const dir = prop as {
        name?: string;
        arg?: { content?: string } | null;
        exp?: { ast?: { type?: string } | null } | null;
        loc: {
          start: { line: number; column: number };
          end: { line: number; column: number };
        };
      };
      if (dir.name !== 'bind') continue;

      const attrName = dir.arg?.content;
      if (!attrName || attrName === 'key') continue;

      const astType = dir.exp?.ast?.type;
      if (astType !== 'ObjectExpression' && astType !== 'ArrayExpression')
        continue;

      diagnostics.push({
        file: ctx.file,
        line: dir.loc.start.line,
        column: dir.loc.start.column,
        endLine: dir.loc.end.line,
        endColumn: dir.loc.end.column,
        ruleId: 'vue-doctor/template/no-inline-object-prop-in-list',
        severity: 'warn',
        message: `<${el.tag}> has an inline ${attrName} prop with an object or array literal inside a v-for subtree. Inline objects and arrays create new references on every render, defeating v-for's ability to reuse DOM nodes.`,
        source: 'template',
        recommendation:
          'Move the object or array to a computed property or a module-level constant so the reference remains stable across renders.',
      });
    }
  }

  for (const child of el.children) {
    if (child.type === 1) {
      checkElement(child as ElementNode, effectiveInVFor, ctx, diagnostics);
    }
  }
}

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];

  function walk(node: TemplateChildNode, inVForSubtree: boolean): void {
    if (node.type === 1) {
      checkElement(node as ElementNode, inVForSubtree, ctx, diagnostics);
    } else if (node.type === 0) {
      const root = node as RootNode;
      for (const child of root.children) {
        walk(child, inVForSubtree);
      }
    }
  }

  walk(ctx.template as unknown as TemplateChildNode, false);
  return { diagnostics };
}
