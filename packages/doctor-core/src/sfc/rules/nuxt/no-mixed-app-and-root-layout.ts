import type { ElementNode } from '@vue/compiler-core';
import type { Diagnostic } from '../../../types.js';
import { isNuxtLayoutFile } from '../../../nuxt/file-role.js';
import { walkElements } from '../../../template/walk.js';
import type { SfcRuleContext, SfcRuleResult } from '../types.js';

const RULE_ID = 'nuxt-doctor/ai-slop/no-mixed-app-and-root-layout';

const MESSAGE =
  'Layout file renders<NuxtLayout> inside itself. This creates a nested layout chain where the root layout renders itself as a slot. Use<slot /> directly and let the page content flow through.';

const RECOMMENDATION =
  'Replace <NuxtLayout> in this layout file with <slot />. The layout slot is already provided by the parent layout wrapper.';

export function check(ctx: SfcRuleContext): SfcRuleResult {
  if (!isNuxtLayoutFile(ctx.relativePath)) return { diagnostics: [] };
  const { template } = ctx.descriptor;
  if (!template || !template.ast) return { diagnostics: [] };
  let foundNuxtLayout = false;
  let nuxtLayoutNode: ElementNode | undefined;
  walkElements(template.ast, (el: ElementNode) => {
    if (el.tag === 'NuxtLayout') {
      foundNuxtLayout = true;
      nuxtLayoutNode = el;
    }
  });
  if (!foundNuxtLayout) return { diagnostics: [] };
  const node = nuxtLayoutNode!;
  const diagnostics: Diagnostic[] = [
    {
      file: ctx.file,
      line: node.loc.start.line,
      column: node.loc.start.column,
      endLine: node.loc.end.line,
      endColumn: node.loc.end.column,
      ruleId: RULE_ID,
      severity: 'warn',
      message: MESSAGE,
      source: 'sfc',
      recommendation: RECOMMENDATION,
    },
  ];
  return { diagnostics };
}
