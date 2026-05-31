# `@geoql/oxlint-plugin-nuxt-doctor`

> oxlint JS plugin for Nuxt 4 anti-patterns and AI-slop detection.

Pairs with oxlint's built-in `vue` plugin via the `jsPlugins` config field. See [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) for how it fits with `@geoql/doctor-core`.

## Usage (standalone oxlint config)

```jsonc
// .oxlintrc.json
{
  "plugins": ["vue"],
  "jsPlugins": ["@geoql/oxlint-plugin-nuxt-doctor"],
  "rules": {
    "nuxt-doctor/no-em-dash-in-string": "error",
  },
}
```

## Rules (alpha)

| Rule | Category | Severity |
| ---- | -------- | -------- |

Rules land per the [issue tracker](https://github.com/geoql/doctor/issues).

## License

MIT © Vinayak Kulkarni
