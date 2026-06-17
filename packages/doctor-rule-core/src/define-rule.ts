import type { Rule, RuleContext } from './types.js';

export function defineRule(rule: Rule): Rule {
  const userFix = rule.fix;
  if (!userFix) return rule;
  return {
    ...rule,
    meta: { ...rule.meta, fixable: 'code' },
    create(context: RuleContext) {
      const wrapped: RuleContext = {
        ...context,
        report(descriptor) {
          const replacement = userFix(descriptor.node);
          if (replacement === null) {
            context.report(descriptor);
            return;
          }
          context.report({
            ...descriptor,
            fix: (fixer) => fixer.replaceText(descriptor.node, replacement),
          });
        },
      };
      return rule.create(wrapped);
    },
  };
}
