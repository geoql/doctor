import { parseSync } from 'oxc-parser';
import type { Diagnostic } from '../../types.js';
import type { SfcRuleContext, SfcRuleResult } from './types.js';

type Program = ReturnType<typeof parseSync>['program'];
type Node = Program['body'][number];
type ExportDefault = Extract<Node, { type: 'ExportDefaultDeclaration' }>;
type Declaration = ExportDefault['declaration'];
type ObjectExpr = Extract<Declaration, { type: 'ObjectExpression' }>;
type CallExpr = Extract<Declaration, { type: 'CallExpression' }>;
type Expression = CallExpr['callee'];

const RULE_ID = 'vue-doctor/sfc/no-mixed-options-and-composition-api';

const MESSAGE =
  'Mixed Options API in a <script setup> SFC. Move data/methods/computed/watch/lifecycle into <script setup> Composition API; keep <script> only for options like name/inheritAttrs. See https://vuejs.org/api/sfc-script-setup.html#usage-alongside-normal-script';

const RECOMMENDATION =
  'Move this option into the <script setup> block using the Composition API, or keep <script> only for options-only config such as name or inheritAttrs.';

const DISALLOWED = new Set<string>([
  'data',
  'methods',
  'computed',
  'watch',
  'props',
  'emits',
  'provide',
  'inject',
  'beforeCreate',
  'created',
  'beforeMount',
  'mounted',
  'beforeUpdate',
  'updated',
  'beforeUnmount',
  'unmounted',
  'activated',
  'deactivated',
  'errorCaptured',
  'serverPrefetch',
]);

function resolveDefineComponentCall(call: CallExpr): ObjectExpr | null {
  if (call.callee.type !== 'Identifier') return null;
  if (call.callee.name !== 'defineComponent') return null;
  const first = call.arguments[0];
  if (!first || first.type !== 'ObjectExpression') return null;
  return first;
}

function findBindingInit(body: Node[], name: string): Expression | null {
  for (const stmt of body) {
    if (stmt.type !== 'VariableDeclaration') continue;
    for (const declarator of stmt.declarations) {
      if (declarator.id.type !== 'Identifier') continue;
      if (declarator.id.name !== name) continue;
      return declarator.init;
    }
  }
  return null;
}

function resolveOptionsObject(program: Program): ObjectExpr | null {
  const exported = program.body.find(
    (node): node is ExportDefault => node.type === 'ExportDefaultDeclaration',
  );
  if (!exported) return null;
  const declaration = exported.declaration;
  if (declaration.type === 'ObjectExpression') return declaration;
  if (declaration.type === 'CallExpression') {
    return resolveDefineComponentCall(declaration);
  }
  if (declaration.type === 'Identifier') {
    const init = findBindingInit(program.body, declaration.name);
    if (init && init.type === 'CallExpression') {
      return resolveDefineComponentCall(init);
    }
    return null;
  }
  return null;
}

function locate(
  content: string,
  offset: number,
  startLine: number,
  startColumn: number,
): { line: number; column: number } {
  let line = startLine;
  let lastNewline = -1;
  for (let i = 0; i < offset; i += 1) {
    if (content.charCodeAt(i) === 10) {
      line += 1;
      lastNewline = i;
    }
  }
  const column =
    lastNewline === -1 ? startColumn + offset : offset - lastNewline;
  return { line, column };
}

export function check(ctx: SfcRuleContext): SfcRuleResult {
  const { script, scriptSetup } = ctx.descriptor;
  if (!script || !scriptSetup) return { diagnostics: [] };

  const lang = script.lang === 'ts' ? 'ts' : 'js';
  const { program } = parseSync(`script.${lang}`, script.content, {
    sourceType: 'module',
    lang,
  });

  const options = resolveOptionsObject(program);
  if (!options) return { diagnostics: [] };

  const diagnostics: Diagnostic[] = [];
  for (const property of options.properties) {
    if (property.type !== 'Property') continue;
    if (property.key.type !== 'Identifier') continue;
    if (!DISALLOWED.has(property.key.name)) continue;
    const { line, column } = locate(
      script.content,
      property.start,
      script.loc.start.line,
      script.loc.start.column,
    );
    diagnostics.push({
      file: ctx.file,
      line,
      column,
      ruleId: RULE_ID,
      severity: 'error',
      message: MESSAGE,
      source: 'sfc',
      recommendation: RECOMMENDATION,
    });
  }
  return { diagnostics };
}
