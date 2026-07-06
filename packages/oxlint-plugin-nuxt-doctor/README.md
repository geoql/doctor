# `@geoql/oxlint-plugin-nuxt-doctor`

> oxlint JS plugin holding the Nuxt 4 script-level rules that [`@geoql/doctor-core`](../doctor-core) runs.

This package is a rule pack, not a tool. It's the Nuxt half of the script pass: oxlint JS-plugin rules that fire against the `<script>` / `<script setup>` ESTree oxlint extracts from `.vue` files and server handlers. `doctor-core` generates the `.oxlintrc.json` that loads this plugin alongside `@geoql/oxlint-plugin-vue-doctor` and wires it in automatically, so **you don't install or configure it directly**. Run [`@geoql/nuxt-doctor`](../nuxt-doctor) and these rules come along for free.

## What's in here

Script-level Nuxt rules across four categories. Other Nuxt checks (`structure`, `nitro`, `seo`, `cloudflare`, `modules-deps`, plus cross-file `data-fetching`) run inside `doctor-core` because they need project-level or multi-file context rather than a single script AST.

| Category        | Rules                                                                                                                 |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| `ai-slop`       | `useState` for server data, fetch in setup, `process.client`/`process.server`, explicit imports of auto-imported APIs |
| `hydration`     | `clientOnly` for browser APIs, no `document` in setup                                                                 |
| `server-routes` | typed `defineEventHandler`, `createError` on failure, validate body with h3 v2                                        |
| `data-fetching` | required `useAsyncData` key inside loops                                                                              |

`nuxt-doctor` surfaces these Nuxt rules **on top of** the full Vue rule set, so a Nuxt audit checks both. To see every rule with its id, severity, and preset membership, run `nuxt-doctor list-rules` (or filter, e.g. `nuxt-doctor list-rules --category hydration`).

## Install

```sh
npm i @geoql/oxlint-plugin-nuxt-doctor
```

Published on [npm](https://www.npmjs.com/package/@geoql/oxlint-plugin-nuxt-doctor) and [JSR](https://jsr.io/@geoql/oxlint-plugin-nuxt-doctor) with provenance. ESM-only, TypeScript. `oxlint` is a peer dependency. Most people never add this dependency themselves; `doctor-core` resolves it for you.

## Scope

Nuxt 4 only (the `app/` directory layout with `compatibilityVersion: 4`). Severity levels are `error | warn | info`.

## Architecture

See [`docs/SPEC.md`](../../docs/SPEC.md) §10 for how the JS plugin co-loads with oxlint's native `vue` plugin and why script, template, and cross-file rules live in different passes.

## License

MIT © Vinayak Kulkarni
