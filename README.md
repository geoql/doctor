# @geoql/doctor

> Your agent writes bad Vue/Nuxt. This catches it.

A pair of CLIs and oxlint plugins that audit Vue 3 + Nuxt 4 apps for performance, correctness, security, and AI-agent anti-patterns.

## Packages

| Package                                                                  | Description                      | Version                                                                                                                                 |
| ------------------------------------------------------------------------ | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| [`@geoql/doctor-core`](packages/doctor-core)                             | Audit engine, scoring, reporters | [![npm](https://img.shields.io/npm/v/@geoql/doctor-core)](https://www.npmjs.com/package/@geoql/doctor-core)                             |
| [`@geoql/oxlint-plugin-vue-doctor`](packages/oxlint-plugin-vue-doctor)   | oxlint JS plugin: Vue 3 rules    | [![npm](https://img.shields.io/npm/v/@geoql/oxlint-plugin-vue-doctor)](https://www.npmjs.com/package/@geoql/oxlint-plugin-vue-doctor)   |
| [`@geoql/oxlint-plugin-nuxt-doctor`](packages/oxlint-plugin-nuxt-doctor) | oxlint JS plugin: Nuxt 4 rules   | [![npm](https://img.shields.io/npm/v/@geoql/oxlint-plugin-nuxt-doctor)](https://www.npmjs.com/package/@geoql/oxlint-plugin-nuxt-doctor) |
| [`@geoql/vue-doctor`](packages/vue-doctor)                               | CLI: `npx -y @geoql/vue-doctor`  | [![npm](https://img.shields.io/npm/v/@geoql/vue-doctor)](https://www.npmjs.com/package/@geoql/vue-doctor)                               |
| [`@geoql/nuxt-doctor`](packages/nuxt-doctor)                             | CLI: `npx -y @geoql/nuxt-doctor` | [![npm](https://img.shields.io/npm/v/@geoql/nuxt-doctor)](https://www.npmjs.com/package/@geoql/nuxt-doctor)                             |

## Quick start

```sh
# Audit a Vue 3 project
npx -y @geoql/vue-doctor

# Audit a Nuxt 4 project
npx -y @geoql/nuxt-doctor
```

## Status

`v0.1.0` — published on [npm](https://www.npmjs.com/org/geoql) and [JSR](https://jsr.io/@geoql) with provenance. See the [v1.0 milestone](https://github.com/geoql/doctor/milestone/3) for the roadmap.

## Development

```sh
pnpm install
pnpm run lint
pnpm run format
```

Requires Node `>=24` and pnpm `11.4.0`.

## License

[MIT](./LICENSE) © [Vinayak Kulkarni](https://vinayakkulkarni.dev)
