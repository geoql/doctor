# @geoql/eslint-plugin-nuxt-doctor

ESLint **flat-config** plugin that flags Nuxt 4 anti-patterns, AI-slop, hydration
traps, and server-route mistakes — the same detection logic that powers
[`@geoql/oxlint-plugin-nuxt-doctor`](../oxlint-plugin-nuxt-doctor), exposed for
teams whose lint pipeline is ESLint rather than oxlint.

## Install

```sh
pnpm add -D @geoql/eslint-plugin-nuxt-doctor @geoql/eslint-plugin-vue-doctor eslint
```

## Usage (flat config)

```js
// eslint.config.js
import nuxtDoctor from '@geoql/eslint-plugin-nuxt-doctor';
import vueDoctor from '@geoql/eslint-plugin-vue-doctor';

export default [
  ...nuxtDoctor.configs.recommended,
  ...vueDoctor.configs.recommended,
];
```

The Nuxt recommended preset **does not** automatically include the Vue rules;
spread both. (Pushing the Vue rules in by default would create a circular
dependency between the two plugin packages — Nuxt extends Vue, not the other way
around.)

### Presets

- `configs.recommended` — every Nuxt rule flagged `recommended` in the shared
  registry, wired at its registry severity (`error`/`warn`).
- `configs.all` — every script rule the plugin ships, all at `error`.

## Scope — script rules only (deliberate)

This plugin wires **every ESTree/JavaScript-AST rule core** from
`@geoql/doctor-rule-core` (the same cores the oxlint plugin uses). Each ESLint
rule is a thin adapter: it imports the shared core and forwards the core's
visitor and message into ESLint's `create` / `context.report` API. There is **no
duplicated detection logic** — a rule's behavior is identical across oxlint and
ESLint because both consume the same core.

**Template-AST rules are intentionally not included.** Those rules remain
available through `@geoql/oxlint-plugin-nuxt-doctor` and the `@geoql/nuxt-doctor`
CLI.

## License

MIT © [Vinayak Kulkarni](https://vinayakkulkarni.dev)
