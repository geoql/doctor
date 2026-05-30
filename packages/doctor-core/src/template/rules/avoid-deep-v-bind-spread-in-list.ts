import type {
  ElementNode,
  RootNode,
  TemplateChildNode,
} from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

const NODE_ELEMENT = 1;
const NODE_DIRECTIVE = 7;

interface SpreadDirective {
  name?: string;
  arg?: unknown;
  exp?: { ast?: unknown } | null;
  loc: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

function isIdentifierSpread(dir: SpreadDirective): boolean {
  return dir.name === 'bind' && dir.arg === undefined && dir.exp?.ast === null;
}

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
      const dir = prop as SpreadDirective;
      if (!isIdentifierSpread(dir)) continue;
      diagnostics.push({
        file: ctx.file,
        line: dir.loc.start.line,
        column: dir.loc.start.column,
        endLine: dir.loc.end.line,
        endColumn: dir.loc.end.column,
        ruleId: 'vue-doctor/template/avoid-deep-v-bind-spread-in-list',
        severity: 'info',
        message: `<${el.tag}> spreads a whole object via v-bind inside a v-for subtree. Spreading a reactive object binds every property per item, which can churn props and defeat patching on large lists.`,
        source: 'template',
        recommendation:
          'Bind only the props each item needs explicitly, or hoist a stable per-item object so Vue can patch instead of re-binding the full spread.',
      });
    }
  }

  for (const child of el.children) {
    if (child.type === NODE_ELEMENT) {
      checkElement(child as ElementNode, effectiveInVFor, ctx, diagnostics);
    }
  }
}

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];

  function walk(node: TemplateChildNode, inVForSubtree: boolean): void {
    if (node.type === NODE_ELEMENT) {
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
