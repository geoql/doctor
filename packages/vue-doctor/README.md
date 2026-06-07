# `@geoql/vue-doctor`

> Your agent writes bad Vue. This catches it.

CLI auditor for Vue 3 apps. It runs a hybrid scan: a template-AST pass over `@vue/compiler-sfc` plus a script pass through `oxlint` (its native `vue` plugin and the doctor JS rules), then merges the findings into a deterministic 0–100 score. Built for catching anti-patterns, AI-slop, and best-practice violations, especially the ones coding agents leave behind.

## Install

```sh
# one-off, no install
npx -y @geoql/vue-doctor

# or add it
npm i @geoql/vue-doctor
```

Published on [npm](https://www.npmjs.com/package/@geoql/vue-doctor) and [JSR](https://jsr.io/@geoql/vue-doctor) at `v0.1.0` with provenance.

## Usage

```sh
vue-doctor [path] [options]
```

`path` defaults to the current directory. The default output format is `agent` (compact, built for LLM consumption), not a verbose human report.

```sh
# Audit ./src and print the agent report
vue-doctor ./src

# Human-readable output, fail the build on warnings
vue-doctor --format pretty --fail-on warn

# Machine-readable, only files changed vs HEAD, write to a file
vue-doctor --json --diff --output report.json

# Just the score, for piping into a gate
vue-doctor --score
```

### Options

| Flag                           | Description                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `--format <kind>`              | Output format: `agent` (default), `pretty`, `json`, `json-compact`, `sarif`, `html`.                                      |
| `--json`                       | Shorthand for `--format json`.                                                                                            |
| `--json-compact`               | Single-line JSON.                                                                                                         |
| `--config <path>`              | Path to `doctor.config.ts`.                                                                                               |
| `--preset <name>`              | Base preset: `minimal`, `recommended`, `strict`, `all`.                                                                   |
| `--fail-on <level>`            | Exit non-zero at this severity or worse: `error` (default), `warn`, `none`.                                               |
| `--quiet`                      | Only show the summary.                                                                                                    |
| `--verbose`                    | Emit per-pass timing and rule diagnostics to stderr.                                                                      |
| `--no-color`                   | Disable colored output.                                                                                                   |
| `--rule <id:level>`            | Override one rule, repeatable. Levels: `error`, `warn`, `info`, `off`. e.g. `--rule vue-doctor/no-em-dash-in-string:off`. |
| `--include <glob>`             | Glob of files to include, repeatable.                                                                                     |
| `--exclude <glob>`             | Glob of files to exclude, repeatable.                                                                                     |
| `--no-dead-code`               | Skip the dead-code (knip) analysis pass.                                                                                  |
| `--no-lint`                    | Skip the lint passes (template / SFC / oxlint).                                                                           |
| `--no-respect-inline-disables` | Surface findings even inside `doctor-disable` comments.                                                                   |
| `--threshold <n>`              | Minimum passing score, integer `0`–`100`.                                                                                 |
| `--score`                      | Print only the numeric score, for piping.                                                                                 |
| `--push`                       | After the audit, POST privacy-stripped findings to the SaaS. Requires `--api-key`. Negatable with `--no-push`.            |
| `--no-push`                    | Skip the SaaS push (default).                                                                                             |
| `--push-url <url>`             | SaaS endpoint for `--push` (default: `https://app.the-doctor.report/api/v1/findings`).                                    |
| `--api-key <key>`              | API key for the SaaS, sent as the `x-api-key` header.                                                                     |
| `--annotations`                | Emit GitHub Actions `::error::` / `::warning::` lines.                                                                    |
| `--ci`                         | Auto-enable CI behavior (annotations on GitHub Actions).                                                                  |
| `--no-ci`                      | Disable CI auto-detection even when a CI env is set.                                                                      |
| `--diff`                       | Only report findings in files changed vs HEAD.                                                                            |
| `--staged`                     | Only report findings in staged files.                                                                                     |
| `--full`                       | Force a complete scan, overriding `--diff` / `--staged`.                                                                  |
| `--output <file>`              | Write the report to a file instead of stdout.                                                                             |

Severity is `error | warn | info` everywhere. `--diff`/`--staged`, `--verbose`/`--quiet`, and `--score`/`--json` are mutually exclusive.

### Subcommands

| Command            | Description                                                                                                                                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list-rules`       | List every registered rule with id, severity, category, source, and preset membership. Filters: `--preset <recommended\|all>`, `--category <name>`, `--source <doctor\|oxlint-builtin\|eslint-plugin-vue>`, `--severity <error\|warn\|info>`, `--json`, `--json-compact`. |
| `explain <ruleId>` | Print a rule's severity, category, recommendation, and help URL. `--json` for structured output.                                                                                                                                                                          |
| `inspect [dir]`    | Print the detected project capabilities doctor uses to gate rules. `--json` / `--json-compact`.                                                                                                                                                                           |

```sh
vue-doctor list-rules --category ai-slop
vue-doctor explain vue-doctor/no-em-dash-in-string
vue-doctor inspect --json
```

### Exit codes

| Code | Meaning                                                                                   |
| ---- | ----------------------------------------------------------------------------------------- |
| `0`  | Clean, or score at/above `--threshold` and no findings at/above `--fail-on`.              |
| `1`  | Findings at/above the `--fail-on` level (default: `error`), or score below `--threshold`. |
| `2`  | Configuration error or scan failure.                                                      |

## Rules

`vue-doctor` ships ~24 Vue rules plus oxlint's native `vue` built-ins, grouped by category: `ai-slop`, `reactivity`, `composition`, `performance`, `template`, `template-perf`, `build-quality`, `deps`, `sfc`, and `dead-code`. Run `vue-doctor list-rules` for the live list. Most are on in the `recommended` preset.

## Scope

Vue 3 only. For Nuxt 4 projects, use [`@geoql/nuxt-doctor`](../nuxt-doctor), which layers Nuxt rules on top of this set.

## Architecture

See [`docs/SPEC.md`](../../docs/SPEC.md) §10.

## License

MIT © Vinayak Kulkarni
