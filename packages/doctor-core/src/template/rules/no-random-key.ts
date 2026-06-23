import type { ElementNode } from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';
import { findBindAttr, findDirective } from '../directive-helpers.js';
import { walkElements } from '../walk.js';
import type { TemplateRuleContext, TemplateRuleResult } from './types.js';

// Calls that yield a fresh value on every evaluation, so using them as a
// v-for :key forces Vue to tear down and re-create every row each render.
const UNSTABLE_KEY_CALL =
  /\b(?:Math\.random|Date\.now|performance\.now|crypto\.randomUUID|uuid|uuidv4|nanoid|uniqueId|cuid|ulid)\s*\(/;

interface BindDirective {
  exp?: { content?: string } | null;
  loc: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

interface ForParseResult {
  key?: { content?: string } | null;
}

function keyExpression(el: ElementNode): BindDirective | undefined {
  const bind = findBindAttr(el, 'key');
  if (!bind) return undefined;
  return bind as unknown as BindDirective;
}

function unstableReason(
  keyContent: string,
  indexVar: string | undefined,
): string | undefined {
  if (UNSTABLE_KEY_CALL.test(keyContent)) {
    return 'a value that changes on every render (e.g. Math.random(), Date.now(), or a fresh uuid)';
  }
  if (indexVar !== undefined && keyContent.trim() === indexVar) {
    return 'the v-for index, which is unstable when the list is reordered, filtered, or spliced';
  }
  return undefined;
}

export function check(ctx: TemplateRuleContext): TemplateRuleResult {
  const diagnostics: Diagnostic[] = [];

  walkElements(ctx.template, (el: ElementNode) => {
    const vFor = findDirective(el, 'for');
    if (!vFor) return;

    const bind = keyExpression(el);
    const keyContent = bind?.exp?.content;
    if (!bind || keyContent === undefined) return;

    const parsed = (vFor as { forParseResult?: ForParseResult }).forParseResult;
    const indexVar = parsed?.key?.content ?? undefined;

    const reason = unstableReason(keyContent, indexVar);
    if (reason === undefined) return;

    diagnostics.push({
      file: ctx.file,
      line: bind.loc.start.line,
      column: bind.loc.start.column,
      endLine: bind.loc.end.line,
      endColumn: bind.loc.end.column,
      ruleId: 'vue-doctor/template/no-random-key',
      severity: 'warn',
      message: `<${el.tag}> uses ${reason} as its v-for :key. Unstable keys defeat Vue's DOM reuse and force a full re-mount of each item, losing component state and hurting performance.`,
      source: 'template',
      recommendation:
        'Use a stable, unique id from the item itself (e.g. :key="item.id") so Vue can reuse DOM nodes across renders.',
    });
  });

  return { diagnostics };
}
