import type { Rule } from 'eslint';
import type { CoreRule, RuleContext, AstNode } from '@geoql/doctor-rule-core';
import { deriveCapabilities } from '@geoql/doctor-rule-core';

export { deriveCapabilities };

type ESLintSeverity = 'error' | 'warn';

export interface ESLintRule extends Rule.RuleModule<ESLintSeverity> {
  readonly id: string;
}

export function toESLintRule(core: CoreRule): ESLintRule {
  const meta: Rule.RuleMetaData<ESLintSeverity> = {
    type: 'problem',
    schema: [],
    messages: { default: '' },
  };
  if (core.meta?.fixable) {
    meta.fixable = 'code';
  }

  return {
    id: core.id,
    meta,
    create(context) {
      const settings = context.settings as Record<string, unknown> | undefined;
      const coreContext: RuleContext = {
        report(descriptor) {
          const node = descriptor.node as unknown as Parameters<
            typeof context.report
          >[0]['node'];
          if (!descriptor.fix) {
            context.report({ node, message: descriptor.message });
            return;
          }
          context.report({
            node,
            message: descriptor.message,
            fix(fixer) {
              const replacement = descriptor.fix!({
                replaceText: (n: AstNode, text: string) => {
                  const rangeStart =
                    (n as unknown as { range?: [number, number] }).range?.[0] ??
                    0;
                  const rangeEnd =
                    (n as unknown as { range?: [number, number] }).range?.[1] ??
                    0;
                  return { range: [rangeStart, rangeEnd], text, node: n };
                },
              });
              return fixer.replaceTextRange(
                replacement.range,
                replacement.text,
              );
            },
          });
        },
        getFilename: () => context.filename,
        settings,
        capabilities: deriveCapabilities(settings),
      };
      const coreVisitors = core.create(coreContext);
      const eslintVisitors: Record<string, (node: unknown) => void> = {};
      for (const key of Object.keys(coreVisitors)) {
        const fn = coreVisitors[key];
        if (typeof fn !== 'function') continue;
        eslintVisitors[key] = fn as (node: unknown) => void;
      }
      return eslintVisitors as unknown as ReturnType<typeof core.create>;
    },
  };
}
