import { defineRule } from '../../define-rule.js';
import type { AstNode, RuleContext } from '../../rule-types.js';

const DOCS_URL = 'https://vuejs.org/guide/components/async.html';
const MESSAGE = `This route record's \`component:\` field references the imported component directly, which forces a synchronous import of the route bundle. Use \`() => import('./Foo.vue')\` or \`defineAsyncComponent(() => import('./Foo.vue'))\` to lazy-load the route. See ${DOCS_URL}`;

function keyName(key: AstNode): unknown {
  return key.type === 'Identifier' ? key.name : key.value;
}

export const preferDefineAsyncComponentOnRoute = defineRule({
  create(context: RuleContext) {
    return {
      Property(node: AstNode) {
        if (node.computed === true || node.shorthand === true) return;
        if (keyName(node.key as AstNode) !== 'component') return;
        const value = node.value as AstNode;
        if (value.type === 'Identifier') {
          context.report({ node, message: MESSAGE });
        }
      },
    };
  },
});
