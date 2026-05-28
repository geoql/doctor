# `@geoql/vue-doctor`

> Your agent writes bad Vue. This catches it.

CLI auditor for Vue 3 apps. Detects anti-patterns, AI-slop, and best-practice violations via a hybrid pass over `@vue/compiler-sfc` template ASTs and `oxlint` (with its built-in `vue` plugin) for script-level rules.

## Quickstart

```bash
npx -y @geoql/vue-doctor ./src
```

## CLI

```
vue-doctor [path] [--format text|json] [--config doctor.config.ts] [--fail-on error|warning]
```

| Flag        | Description                                                                |
| ----------- | -------------------------------------------------------------------------- |
| `--format`  | `text` (default) or `json`                                                 |
| `--config`  | Path to `doctor.config.ts`. Defaults to `./doctor.config.ts` if it exists. |
| `--fail-on` | `error` (default) or `warning` — threshold for non-zero exit code.         |

Exit codes:

| Code | Meaning                                                      |
| ---- | ------------------------------------------------------------ |
| 0    | No findings at/above `--fail-on` threshold (default: error). |
| 1    | Findings at/above threshold.                                 |
| 2    | Configuration error or scan failure.                         |

## Architecture

See [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md).

## License

MIT © Vinayak Kulkarni
