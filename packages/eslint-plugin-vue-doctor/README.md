# @geoql/eslint-plugin-vue-doctor

ESLint **flat-config** plugin that flags Vue 3 anti-patterns, AI-slop, reactivity
leaks, composition mistakes, and security issues — the same detection logic that
powers [`@geoql/oxlint-plugin-vue-doctor`](../oxlint-plugin-vue-doctor), exposed
for teams whose lint pipeline is ESLint rather than oxlint.

## Install

```sh
pnpm add -D @geoql/eslint-plugin-vue-doctor eslint
```

## Usage (flat config)

```js
// eslint.config.js
import vueDoctor from '@geoql/eslint-plugin-vue-doctor';

export default [vueDoctor.configs.recommended];
```

Or wire individual rules:

```js
import vueDoctor from '@geoql/eslint-plugin-vue-doctor';

export default [
  {
    plugins: { 'vue-doctor': vueDoctor },
    rules: {
      'vue-doctor/security/no-eval-like': 'error',
    },
  },
];
```

### Presets

- `configs.recommended` — every rule flagged `recommended` in the shared registry,
  wired at its registry severity (`error`/`warn`).
- `configs.all` — every script rule the plugin ships, all at `error`.

### Capabilities (`settings`)

Some rules only fire when the project has a matching capability. Provide them via
the `vue-doctor` settings namespace:

```js
export default [
  {
    plugins: { 'vue-doctor': vueDoctor },
    settings: { 'vue-doctor': { capabilities: ['auto-imports:vue'] } },
    rules: { 'vue-doctor/no-imports-from-vue-when-auto-imported': 'warn' },
  },
];
```

## Scope — script rules only (deliberate)

This plugin wires **every ESTree/JavaScript-AST rule core** from
`@geoql/doctor-rule-core` (the same cores oxlint uses). Each ESLint rule is a thin
adapter: it imports the shared core and forwards the core's visitor and message
into ESLint's `create` / `context.report` API. There is **no duplicated detection
logic** — a rule's behavior is identical across oxlint and ESLint because both
consume the same core.

**Template-AST rules are intentionally not included.** Rules such as
`v-for-has-key` operate on the `@vue/compiler-sfc` template AST, which has a
completely different node shape from ESLint's JavaScript AST. Surfacing them in
ESLint would require a `vue-eslint-parser` `defineTemplateBodyVisitor` bridge over
a different AST — a separate, non-mechanical adapter. Those template rules remain
available through `@geoql/oxlint-plugin-vue-doctor` and the `@geoql/vue-doctor`
CLI. This plugin ships a complete, correct adapter for the script-rule surface
rather than a half-built template bridge.

## License

MIT © [Vinayak Kulkarni](https://vinayakkulkarni.dev)
