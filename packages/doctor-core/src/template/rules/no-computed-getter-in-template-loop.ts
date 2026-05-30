import type {
  ElementNode,
  RootNode,
  TemplateChildNode,
} from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

const NODE_ELEMENT = 1;
const NODE_INTERPOLATION = 5;
const NODE_DIRECTIVE = 7;

interface ExprNode {
  type?: string;
  computed?: boolean;
  name?: string;
  object?: ExprNode;
  property?: ExprNode;
}

interface Loc {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

interface BindDirective {
  name?: string;
  exp?: { ast?: unknown } | null;
  loc: Loc;
}

interface InterpolationNode {
  content: { ast?: unknown };
  loc: Loc;
}

function isValueDeref(node: ExprNode): boolean {
  if (node.type !== 'MemberExpression' || node.computed === true) return false;
  const { object, property } = node as {
    object: ExprNode;
    property: ExprNode;
  };
  return object.type === 'Identifier' && property.name === 'value';
}

function containsValueDeref(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) {
    return value.some((item) => containsValueDeref(item));
  }
  const node = value as ExprNode;
  return (
    isValueDeref(node) ||
    Object.values(node).some((child) => containsValueDeref(child))
  );
}

function pushDiagnostic(
  el: ElementNode,
  loc: Loc,
  ctx: TemplateRuleContext,
  diagnostics: Diagnostic[],
): void {
  diagnostics.push({
    file: ctx.file,
    line: loc.start.line,
    column: loc.start.column,
    endLine: loc.end.line,
    endColumn: loc.end.column,
    ruleId: 'vue-doctor/template/no-computed-getter-in-template-loop',
    severity: 'warn',
    message: `<${el.tag}> reads a ref or computed via .value inside a v-for subtree. The getter re-runs on every item and every render, which is easy to hoist out of the loop.`,
    source: 'template',
    recommendation:
      'Read .value once into a computed property or a local binding outside the loop so the getter runs a single time per render.',
  });
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
      const dir = prop as BindDirective;
      if (dir.name !== 'bind') continue;
      if (containsValueDeref(dir.exp?.ast)) {
        pushDiagnostic(el, dir.loc, ctx, diagnostics);
      }
    }

    for (const child of el.children) {
      if (child.type === NODE_INTERPOLATION) {
        const interp = child as unknown as InterpolationNode;
        if (containsValueDeref(interp.content.ast)) {
          pushDiagnostic(el, interp.loc, ctx, diagnostics);
        }
      }
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
