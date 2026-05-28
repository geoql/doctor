# `@geoql/oxlint-plugin-vue-doctor`

> oxlint JS plugin for Vue 3 anti-patterns and AI-slop detection.

Pairs with oxlint's built-in `vue` plugin via the `jsPlugins` config field. See [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) for how it fits with `@geoql/doctor-core`.

## Usage (standalone oxlint config)

```jsonc
// .oxlintrc.json
{
  "plugins": ["vue"],
  "jsPlugins": ["@geoql/oxlint-plugin-vue-doctor"],
  "rules": {
    "vue-doctor/no-em-dash-in-string": "error",
  },
}
```

## Rules (alpha)

| Rule                              | Category | Severity |
| --------------------------------- | -------- | -------- |
| `vue-doctor/no-em-dash-in-string` | ai-slop  | error    |

More rules land per the [issue tracker](https://github.com/geoql/doctor/issues).

## License

MIT © Vinayak Kulkarni
