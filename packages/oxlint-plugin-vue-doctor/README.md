# `@geoql/oxlint-plugin-vue-doctor`

> oxlint JS plugin holding the Vue 3 script-level rules that [`@geoql/doctor-core`](../doctor-core) runs.

This package is a rule pack, not a tool. It's the `jsPlugins` half of the script pass: a set of oxlint JS-plugin rules that fire against the `<script>` / `<script setup>` ESTree oxlint extracts from `.vue` files. `doctor-core` generates the `.oxlintrc.json` that loads this plugin and wires it in automatically, so **you don't install or configure it directly**. Run [`@geoql/vue-doctor`](../vue-doctor) and these rules come along for free.

## What's in here

Script-level Vue rules across four categories. Template-shaped rules (`v-for`/`:key`, `v-if`+`v-for`) live in `doctor-core`'s in-process template pass instead, because oxlint never hands JS plugins the template AST.

| Category      | Rules                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `ai-slop`     | em-dash strings, destructuring props/reactive without `toRefs`, non-null assertions on `.value`, explicit imports of auto-imported Vue APIs |
| `composition` | typed `defineProps`, prefer `<script setup>` for new files                                                                                  |
| `reactivity`  | `watch` without cleanup, `shallowRef` for large data, `readonly` for injected values                                                        |
| `performance` | `defineAsyncComponent` on route components                                                                                                  |

To see every rule with its id, severity, and preset membership, run `vue-doctor list-rules` (or filter, e.g. `vue-doctor list-rules --source doctor --category ai-slop`).

## Install

```sh
npm i @geoql/oxlint-plugin-vue-doctor
```

Published on [npm](https://www.npmjs.com/package/@geoql/oxlint-plugin-vue-doctor) and [JSR](https://jsr.io/@geoql/oxlint-plugin-vue-doctor) at `v0.1.0` with provenance. ESM-only, TypeScript. `oxlint` is a peer dependency. Most people never add this dependency themselves; `doctor-core` resolves it for you.

## Scope

Vue 3 only. Severity levels are `error | warn | info`.

## Architecture

See [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) for how the JS plugin co-loads with oxlint's native `vue` plugin and why the script and template rules live in different passes.

## License

MIT © Vinayak Kulkarni
