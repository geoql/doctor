# @geoql/doctor

> Your agent writes bad Vue/Nuxt. This catches it.

[![npm](https://img.shields.io/npm/v/@geoql/vue-doctor?label=vue-doctor)](https://www.npmjs.com/package/@geoql/vue-doctor)
[![npm](https://img.shields.io/npm/v/@geoql/nuxt-doctor?label=nuxt-doctor)](https://www.npmjs.com/package/@geoql/nuxt-doctor)
[![JSR](https://jsr.io/badges/@geoql/vue-doctor)](https://jsr.io/@geoql/vue-doctor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![dashboard](https://img.shields.io/badge/dashboard-the--doctor.report-c2410c)](https://the-doctor.report/?utm_source=github&utm_medium=readme&utm_campaign=repo-badge)

## What is this?

A pnpm monorepo of CLIs, oxlint + eslint plugins, and a language server that audit Vue 3 and Nuxt 4 apps for performance, correctness, security, and AI-agent anti-patterns. It does not scaffold or generate. It critiques the code your agent just wrote and gives it a deterministic 0-100 health score. The audit runs fully local and offline: same code in, same score out.

Full docs, rule reference, config, and scoring live at [docs.the-doctor.report](https://docs.the-doctor.report).

## Hosted dashboard (optional)

The CLI is the whole product and stays free. If you want the score tracked over time instead of just printed once, [the-doctor.report](https://the-doctor.report/?utm_source=github&utm_medium=readme&utm_campaign=repo-pitch) is a hosted dashboard: push a run from CI with `--push`, and it keeps the score trend, per-rule findings, and per-branch history for each project. It stores rule IDs, severities, and file paths only — never your source, snippets, or messages. Nothing about local CLI usage phones home; the dashboard is opt-in and gated behind your own API key.

## Ecosystem

| Repo                       | What                            | Link                                                                     |
| -------------------------- | ------------------------------- | ------------------------------------------------------------------------ |
| `geoql/doctor` (this repo) | OSS CLIs + oxlint rule plugins  | [github.com/geoql/doctor](https://github.com/geoql/doctor)               |
| `geoql/doctor-action`      | GitHub Action wrapper           | [github.com/geoql/doctor-action](https://github.com/geoql/doctor-action) |
| `the-doctor.report`        | Hosted SaaS dashboard (private) | [app.the-doctor.report](https://app.the-doctor.report)                   |
| Docs                       | Rules, CLI, scoring reference   | [docs.the-doctor.report](https://docs.the-doctor.report)                 |

## Packages

| Package                                                                  | Version                                                                                                                                 | Description                                                   |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [`@geoql/vue-doctor`](packages/vue-doctor)                               | [![npm](https://img.shields.io/npm/v/@geoql/vue-doctor)](https://www.npmjs.com/package/@geoql/vue-doctor)                               | CLI for Vue 3 projects                                        |
| [`@geoql/nuxt-doctor`](packages/nuxt-doctor)                             | [![npm](https://img.shields.io/npm/v/@geoql/nuxt-doctor)](https://www.npmjs.com/package/@geoql/nuxt-doctor)                             | CLI for Nuxt 4 projects                                       |
| [`@geoql/doctor-core`](packages/doctor-core)                             | [![npm](https://img.shields.io/npm/v/@geoql/doctor-core)](https://www.npmjs.com/package/@geoql/doctor-core)                             | Audit engine: scoring, reporters, hybrid two-pass analysis    |
| [`@geoql/doctor-rule-core`](packages/doctor-rule-core)                   | [![npm](https://img.shields.io/npm/v/@geoql/doctor-rule-core)](https://www.npmjs.com/package/@geoql/doctor-rule-core)                   | Linter-neutral rule cores shared by the oxlint/eslint plugins |
| [`@geoql/oxlint-plugin-vue-doctor`](packages/oxlint-plugin-vue-doctor)   | [![npm](https://img.shields.io/npm/v/@geoql/oxlint-plugin-vue-doctor)](https://www.npmjs.com/package/@geoql/oxlint-plugin-vue-doctor)   | oxlint JS plugin: Vue 3 rules                                 |
| [`@geoql/oxlint-plugin-nuxt-doctor`](packages/oxlint-plugin-nuxt-doctor) | [![npm](https://img.shields.io/npm/v/@geoql/oxlint-plugin-nuxt-doctor)](https://www.npmjs.com/package/@geoql/oxlint-plugin-nuxt-doctor) | oxlint JS plugin: Nuxt 4 rules                                |
| [`@geoql/eslint-plugin-vue-doctor`](packages/eslint-plugin-vue-doctor)   | [![npm](https://img.shields.io/npm/v/@geoql/eslint-plugin-vue-doctor)](https://www.npmjs.com/package/@geoql/eslint-plugin-vue-doctor)   | ESLint flat-config plugin: Vue 3 rules                        |
| [`@geoql/eslint-plugin-nuxt-doctor`](packages/eslint-plugin-nuxt-doctor) | [![npm](https://img.shields.io/npm/v/@geoql/eslint-plugin-nuxt-doctor)](https://www.npmjs.com/package/@geoql/eslint-plugin-nuxt-doctor) | ESLint flat-config plugin: Nuxt 4 rules                       |
| [`@geoql/doctor-language-server`](packages/doctor-language-server)       | [![npm](https://img.shields.io/npm/v/@geoql/doctor-language-server)](https://www.npmjs.com/package/@geoql/doctor-language-server)       | LSP server for editor integration (npm-only)                  |

The two CLIs ship at `1.2.2`. All nine packages publish to [npm](https://www.npmjs.com/org/geoql) with OIDC provenance; the eight library/plugin packages also publish to [JSR](https://jsr.io/@geoql) (the language server is npm-only — it is a stdio binary run via `npx`, with npm-only `vscode-*` deps).

## Quick start

```sh
# Audit a Vue 3 project (npm)
npx -y @geoql/vue-doctor

# Audit a Nuxt 4 project (npm)
npx -y @geoql/nuxt-doctor

# Run from JSR (Deno)
deno run -A jsr:@geoql/vue-doctor
deno run -A jsr:@geoql/nuxt-doctor
```

Both CLIs print a health score with grouped diagnostics and exit non-zero when findings breach your `--fail-on` threshold, so they drop straight into CI.

## Monorepo layout

```
geoql/doctor/
├── packages/
│   ├── doctor-core/                  # @geoql/doctor-core — audit engine
│   ├── doctor-rule-core/             # @geoql/doctor-rule-core — shared rule cores
│   ├── vue-doctor/                   # @geoql/vue-doctor — Vue 3 CLI
│   ├── nuxt-doctor/                  # @geoql/nuxt-doctor — Nuxt 4 CLI
│   ├── oxlint-plugin-vue-doctor/     # Vue 3 oxlint rules
│   ├── oxlint-plugin-nuxt-doctor/    # Nuxt 4 oxlint rules
│   ├── eslint-plugin-vue-doctor/     # Vue 3 eslint rules
│   ├── eslint-plugin-nuxt-doctor/    # Nuxt 4 eslint rules
│   ├── doctor-language-server/       # LSP server (npm-only)
│   ├── vscode-doctor/                # VS Code extension (not published to npm)
│   └── benchmark/                    # perf workspace (not published)
├── apps/docs/                        # docs.the-doctor.report (Nuxt)
└── docs/SPEC.md                      # the locked spec
```

## CLI flags

Both `vue-doctor` and `nuxt-doctor` share the same surface. Key flags:

| Flag                                     | Purpose                                                                                        |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `--preset <name>`                        | Base preset: `minimal` \| `recommended` \| `strict` \| `all`                                   |
| `--format <kind>`                        | `agent` (default) \| `pretty` \| `json` \| `json-compact` \| `sarif` \| `html` \| `pr-comment` |
| `--fail-on <level>`                      | Exit non-zero on `error` \| `warn` \| `none` (default `error`)                                 |
| `--threshold <n>`                        | Minimum passing score 0-100                                                                    |
| `--rule <id:level>`                      | Override one rule (repeatable), e.g. `--rule a/b:off`                                          |
| `--fix`                                  | Auto-fix oxlint-pass findings in place (full scan only)                                        |
| `--diff` / `--staged` / `--full`         | Scope to changed, staged, or all files                                                         |
| `--category <cat>` / `--dimension <dim>` | Score only rules in a category or dimension (repeatable)                                       |
| `--max-duration <seconds>`               | Soft time budget; on timeout, return partial results (`incomplete` + `skippedCheckReasons`)    |
| `--score`                                | Print only the integer score                                                                   |
| `--output <file>`                        | Write the report to a file                                                                     |
| `--pr-comment`                           | Emit a Markdown PR-comment body                                                                |
| `--push`                                 | POST privacy-stripped findings to the SaaS (needs `--api-key`)                                 |
| `--push-url <url>`                       | Findings endpoint (default `https://app.the-doctor.report/api/v1/findings`)                    |
| `--api-key <key>`                        | the-doctor.report API key (`doc_…`), sent as the `x-api-key` header                            |
| `--push-project <slug>`                  | Dashboard project slug, e.g. `owner/repo` (defaults to the audited dir name)                   |

Subcommands: `list-rules`, `explain <ruleId>`, `inspect [dir]`, `init [dir]`, `ci install [dir]` (scaffold a CI workflow that runs `geoql/doctor-action@v2`). Run `vue-doctor --help` for the complete list. The JSON report's `projectInfo.frameworkDetected` boolean tells a real Vue/Nuxt audit apart from a scan that found no project.

## Scoring model

Internal severities are `error`, `warn`, and `info` with weights `5`, `2`, and `0.5`. The score uses square-root decay: each repeated occurrence of a rule contributes `weight × 1/√(i+1)`, so the first hit costs full weight and repeats cost less. The final score is `max(0, round(100 − penalty))`. `--fail-on` accepts `error`, `warn`, or `none`. An invalid value exits `2`.

## Development

```sh
pnpm install
pnpm run lint        # vp lint
pnpm run format      # vp fmt
pnpm run build       # vp pack per package
pnpm run coverage    # vitest run --coverage (100% gate)
```

Requires Node `>=24.11.0` and pnpm `11.8.0`.

## License

[MIT](./LICENSE) © [Vinayak Kulkarni](https://vinayakkulkarni.dev)
