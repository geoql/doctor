import { defineRule } from '../../define-rule.js';
import type { AstNode, RuleContext } from '../../rule-types.js';
import { VUE_AUTO_IMPORTED } from '../../shared/vue-auto-imported-symbols.js';

const DOCS_URL = 'https://nuxt.com/docs/4.x/guide/concepts/auto-imports';
const WHOLE_MESSAGE = `The entire import from 'vue' can be removed — these names are auto-imported in this project. See ${DOCS_URL}`;
const SPECIFIER_MESSAGE = `This symbol is auto-imported in your project. Remove it from the 'vue' import — it is dead weight in the diff. See ${DOCS_URL}`;

function isAutoImportedValueSpecifier(spec: AstNode): boolean {
  if (spec.importKind === 'type') return false;
  const imported = spec.imported as AstNode;
  return VUE_AUTO_IMPORTED.has(imported.name as string);
}

export const noImportsFromVueWhenAutoImported = defineRule({
  create(context: RuleContext) {
    let gated = false;
    return {
      Program() {
        gated = context.capabilities?.has('auto-imports:vue') !== true;
      },
      ImportDeclaration(node: AstNode) {
        if (gated) return;
        if (node.importKind === 'type') return;
        const source = node.source as AstNode;
        if (source.value !== 'vue') return;
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
