# @geoql/doctor

> Your agent writes bad Vue/Nuxt. This catches it.

A pair of CLIs and oxlint plugins that audit Vue 3 + Nuxt 4 apps for performance, correctness, security, and AI-agent anti-patterns.

## Packages

| Package                                                                  | Description                      | Status             |
| ------------------------------------------------------------------------ | -------------------------------- | ------------------ |
| [`@geoql/doctor-core`](packages/doctor-core)                             | Audit engine, scoring, reporters | _scaffold pending_ |
| [`@geoql/oxlint-plugin-vue-doctor`](packages/oxlint-plugin-vue-doctor)   | oxlint JS plugin: Vue 3 rules    | _scaffold pending_ |
| [`@geoql/oxlint-plugin-nuxt-doctor`](packages/oxlint-plugin-nuxt-doctor) | oxlint JS plugin: Nuxt 4 rules   | _scaffold pending_ |
| [`@geoql/vue-doctor`](packages/vue-doctor)                               | CLI: `npx -y @geoql/vue-doctor`  | _scaffold pending_ |
| [`@geoql/nuxt-doctor`](packages/nuxt-doctor)                             | CLI: `npx -y @geoql/nuxt-doctor` | _scaffold pending_ |

## Quick start

```sh
# Audit a Vue 3 project
npx -y @geoql/vue-doctor

# Audit a Nuxt 4 project
npx -y @geoql/nuxt-doctor
```

## Status

Pre-alpha. See the [v1.0 milestone](https://github.com/geoql/doctor/milestone/3) for the roadmap.

## Development

```sh
pnpm install
pnpm run lint
pnpm run format
```

Requires Node `>=24` and pnpm `11.4.0`.

## License

[MIT](./LICENSE) © [Vinayak Kulkarni](https://vinayakkulkarni.dev)
