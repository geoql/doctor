import type { ElementNode } from '@vue/compiler-core';
import { babelParse } from '@vue/compiler-sfc';
import type { Diagnostic } from '../../types.js';
import { findDirective } from '../directive-helpers.js';
import { walkElements } from '../walk.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

const ARRAY_LITERAL_THRESHOLD = 100;

function findLargeArrayBindings(script: string): Map<string, number> {
  const bindings = new Map<string, number>();
  try {
    const ast = babelParse(script, { sourceType: 'module' });
    for (const node of ast.program.body) {
      if (node.type !== 'VariableDeclaration') continue;
      if (node.kind !== 'const' && node.kind !== 'let') continue;
      for (const decl of node.declarations) {
        if (decl.id.type !== 'Identifier') continue;
        const init = decl.init;
        if (!init || init.type !== 'ArrayExpression') continue;
        if (!init.elements || init.elements.length <= ARRAY_LITERAL_THRESHOLD)
          continue;
        bindings.set(decl.id.name, init.elements.length);
      }
    }
  } catch {
    // ignore parse errors
  }
  return bindings;
}

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];

  const largeArrays =
    ctx.script && ctx.script.length > 0
      ? findLargeArrayBindings(ctx.script)
      : new Map<string, number>();

  walkElements(ctx.template, (el: ElementNode) => {
    const vFor = findDirective(el, 'for');
    if (!vFor) return;

    const vMemo = findDirective(el, 'memo');
    if (vMemo) return;

    const source = vFor.forParseResult?.source;
    if (!source) return;

    const sourceName = source.content;
    const largeArraySize = largeArrays.get(sourceName);
    if (
      largeArraySize !== undefined &&
      largeArraySize > ARRAY_LITERAL_THRESHOLD
    ) {
      diagnostics.push({
        file: ctx.file,
        line: el.loc.start.line,
        column: el.loc.start.column,
        endLine: el.loc.end.line,
        endColumn: el.loc.end.column,
        ruleId: 'vue-doctor/template/v-memo-on-large-list',
        severity: 'warn',
        message: `<${el.tag}> uses v-for over a large dataset (array literal with ${largeArraySize} items) without v-memo. Vue cannot skip diffing this list on every render.`,
        source: 'template',
        recommendation:
          'Add v-memo with a meaningful memoization key so Vue can skip re-rendering unchanged items.',
      });
    }
  });

  return { diagnostics };
}
