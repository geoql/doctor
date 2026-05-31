import { defineRule } from '../../define-rule.js';
import type { AstNode, RuleContext } from '../../rule-types.js';
import { NUXT_AUTO_IMPORTED } from '../../shared/nuxt-auto-imported-symbols.js';

const DOCS_URL = 'https://nuxt.com/docs/4.x/guide/concepts/auto-imports';
const WHOLE_MESSAGE = `These symbols are auto-imported in Nuxt projects. Remove the import entirely. See ${DOCS_URL}`;
const SPECIFIER_MESSAGE = `This symbol is auto-imported in Nuxt projects. Remove it from the import — it is dead weight. See ${DOCS_URL}`;

const AUTO_IMPORT_SOURCES = new Set(['vue', '#imports', 'vue-router', '#app']);

function isAutoImportedValueSpecifier(spec: AstNode): boolean {
  if (spec.importKind === 'type') return false;
  const imported = spec.imported as AstNode;
  return NUXT_AUTO_IMPORTED.has(imported.name as string);
}

export const noExplicitImportsOfAutoImported = defineRule({
  create(context: RuleContext) {
    return {
      ImportDeclaration(node: AstNode) {
        if (node.importKind === 'type') return;
        const source = node.source as AstNode;
        if (!AUTO_IMPORT_SOURCES.has(source.value as string)) return;
        const specifiers = node.specifiers as AstNode[];
        const named = specifiers.filter((s) => s.type === 'ImportSpecifier');
        if (named.length === 0) return;
        const offending = named.filter(isAutoImportedValueSpecifier);
        if (offending.length === 0) return;
        if (
          offending.length === named.length &&
          specifiers.length === named.length
        ) {
          context.report({ node, message: WHOLE_MESSAGE });
          return;
        }
        for (const spec of offending) {
          context.report({ node: spec, message: SPECIFIER_MESSAGE });
        }
      },
    };
  },
});
