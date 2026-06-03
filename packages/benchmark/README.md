# @geoql/doctor-benchmark

Benchmark suite for `@geoql/doctor` measuring it against `eslint-plugin-vue` on a synthetic Vue/Nuxt corpus using [mitata](https://www.npmjs.com/package/mitata).

## Setup

```bash
pnpm install --no-frozen-lockfile
pnpm --filter @geoql/doctor-benchmark gen-fixtures
```

## Run

```bash
pnpm --filter @geoql/doctor-benchmark bench
```

## What It Measures

- **doctor**: `@geoql/doctor-core` `audit()` API — runs template AST analysis (via `@vue/compiler-sfc`), oxlint subprocess (JS/TS), and SFC pass in a single process.
- **eslint-plugin-vue**: ESLint v10 Node API with `vue-eslint-parser` + `eslint-plugin-vue` rules over the same corpus.

## Caveats — Not Apples-to-Apples

`doctor` does a superset of what `eslint-plugin-vue` covers:

| Feature                  | doctor                       | eslint-plugin-vue            |
| ------------------------ | ---------------------------- | ---------------------------- |
| Template AST analysis    | ✅ (via `@vue/compiler-sfc`) | ✅ (via `vue-eslint-parser`) |
| JS/TS linting            | ✅ (via oxlint)              | ✅ (via eslint)              |
| Dead code detection      | ✅ (via knip)                | ❌                           |
| Cross-file Nuxt analysis | ✅                           | ❌                           |
| Build quality checks     | ✅                           | ❌                           |
| Dependency checks        | ✅                           | ❌                           |
| AI-agent anti-patterns   | ✅                           | ❌                           |

Therefore timing comparisons are indicative, not competitive. doctor trades additional analysis for broader coverage.

## Results

| Tool                     | Files | Avg ms |
| ------------------------ | ----- | ------ |
| doctor (vue, audit API)  | ~250  | 122 ms |
| eslint-plugin-vue (vue)  | ~250  | 3.8 ms |
| doctor (nuxt, audit API) | ~50   | 106 ms |

_Run `pnpm --filter @geoql/doctor-benchmark bench` to populate._

## Note on @nuxt/eslint

`@nuxt/eslint` / `@nuxt/eslint-config` requires a full Nuxt context (module resolution, config files) and cannot run standalone against arbitrary fixture files. It is not included in the benchmark — its coverage overlaps with `eslint-plugin-vue` for Vue SFCs and adds Nuxt-specific rules via the same underlying parser. The comparison is documented as `eslint-plugin-vue` vs doctor, with @nuxt/eslint noted as "best-effort Nuxt context required."
