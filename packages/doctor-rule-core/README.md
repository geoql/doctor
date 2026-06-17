# @geoql/doctor-rule-core

Linter-neutral rule cores shared by:

- `@geoql/oxlint-plugin-vue-doctor`
- `@geoql/oxlint-plugin-nuxt-doctor`
- the future ESLint plugin (parity item #4)

## What lives here

Pure detection logic for rules that operate on the **ESTree / JavaScript AST**:

- rule metadata (`id`, `category`, `severity`, `recommended`, `meta`)
- the visitor spec returned by `create(context)`
- the optional `fix(node) => string | null` transform
- shared helpers such as `defineRule` and the auto-imported symbol sets

## What does NOT live here

Template-AST rules (e.g. `v-for-has-key`) operate on the `@vue/compiler-sfc`
template AST, which has a completely different node shape and traversal model.
They remain in `@geoql/doctor-core` alongside the hybrid engine that runs them.

## Adapter contract

A linter adapter should consume each `CoreRule` and wire it into its own
linter API. The core shape is intentionally identical to the ESLint / oxlint
JS-plugin contract:

```ts
export interface CoreRule {
  readonly id: string;
  readonly category: RuleCategory;
  readonly severity: 'error' | 'warn' | 'info';
  readonly recommended: boolean;
  readonly meta?: RuleMeta;
  readonly create: (context: RuleContext) => Record<string, RuleVisitor>;
  readonly fix?: (node: AstNode) => string | null;
}
```

For oxlint, the adapter is a thin identity wrapper because the shape already
matches oxlint's `Rule`. For ESLint, the adapter will map the same `create`
visitor object into ESLint's `context.report()` API.

## Adding a new rule

1. Add the rule file under `src/rules/vue/` or `src/rules/nuxt/`.
2. Export it from the matching `src/rules/vue/index.ts` or
   `src/rules/nuxt/index.ts`.
3. Add the rule to `RULE_REGISTRY` in `@geoql/doctor-core`.
4. Add the rule id to the matching allowlist in
   `@geoql/doctor-core/src/oxlint/generate-config.ts`.
