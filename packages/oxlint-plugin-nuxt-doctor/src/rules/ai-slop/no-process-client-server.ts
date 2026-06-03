import { defineRule } from '../../define-rule.js';
import type { AstNode, RuleContext } from '../../rule-types.js';

const LEGACY_PROPS = new Set(['client', 'server', 'browser']);
const DOCS_URL = 'https://nuxt.com/docs/4.x/guide/concepts/auto-imports';
const MESSAGE = `Use import.meta.client / import.meta.server / import.meta.browser instead of process.client / process.server / process.browser (Nuxt 4). See ${DOCS_URL}`;

export const noProcessClientServer = defineRule({
  create(context: RuleContext) {
    return {
      MemberExpression(node: AstNode) {
        const object = node.object as AstNode | undefined;
        if (object?.type !== 'Identifier') return;
        if ((object as AstNode & { name: string }).name !== 'process') return;
        const property = node.property as AstNode | undefined;
        if (property?.type !== 'Identifier') return;
        if (!LEGACY_PROPS.has(property.name as string)) return;
        context.report({ node, message: MESSAGE });
      },
    };
  },
  fix(node: AstNode) {
    const object = node.object as AstNode | undefined;
    if (object?.type !== 'Identifier') return null;
    if ((object as AstNode & { name: string }).name !== 'process') return null;
    const property = node.property as AstNode | undefined;
    if (property?.type !== 'Identifier') return null;
    const name = property.name as string;
    if (!LEGACY_PROPS.has(name)) return null;
    return `import.meta.${name}`;
  },
});
