# `@geoql/doctor-core`

> The audit engine behind [`@geoql/vue-doctor`](../vue-doctor) and [`@geoql/nuxt-doctor`](../nuxt-doctor).

This is the library that does the work. The two CLIs are thin `cac` wrappers; everything real lives here: the hybrid scan, scoring, reporters, config loading, and project detection. You usually depend on a CLI, not on this package directly. Reach for `doctor-core` only when you're embedding the audit into your own tool.

## What it does

`doctor-core` runs a **hybrid two-pass scan** over a Vue 3 or Nuxt 4 project, as locked in [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md):

- **Pass 1 — template AST.** Parses `.vue` SFCs with `@vue/compiler-sfc` and walks the template AST in-process. This is the only pass that can see the template, so template-shaped rules (`v-for` missing `:key`, `v-if`/`v-for` on the same node, inline object props in lists) live here.
- **Pass 2 — script ESTree.** Spawns `oxlint` as a subprocess against a generated `.oxlintrc.json` that turns on oxlint's native `vue` plugin plus the doctor JS plugins (`@geoql/oxlint-plugin-vue-doctor`, `@geoql/oxlint-plugin-nuxt-doctor`). oxlint only hands JS plugins the extracted `<script>`, so all script-level rules run here.

Diagnostics from both passes are merged and deduped on `(file, line, column, ruleId)`, then collapsed into a deterministic 0–100 score. Scoring uses fixed severity weights (`error` = 5, `warn` = 2, `info` = 0.5) with √-decay on repeat offenders so one noisy rule can't tank the whole score. Same code in, same score out: no randomness, no config-tunable weights.

It also owns the pieces the CLIs surface: the config loader (`doctor.config.ts` via `c12`), project/capability detection used to gate rules, the rule registry, and every reporter format.

## Install

```sh
npm i @geoql/doctor-core
```

Published on [npm](https://www.npmjs.com/package/@geoql/doctor-core) and [JSR](https://jsr.io/@geoql/doctor-core) at `v0.1.0` with provenance. ESM-only. `knip` and `oxlint` are peer dependencies (the dead-code and script passes shell out to them).

## API

The main entry is `audit()`. It returns a report carrying diagnostics, the numeric score, the score breakdown, detected project info, and a process exit code.

```ts
import { audit, format } from '@geoql/doctor-core';

const report = await audit({
  rootDir: process.cwd(),
  include: ['**/*.vue', '**/*.ts'],
  exclude: ['node_modules', 'dist', '.nuxt', '.output'],
  failOn: 'error',
});

for (const d of report.diagnostics) {
  console.log(
    `${d.file}:${d.line}:${d.column} ${d.severity} ${d.ruleId}: ${d.message}`,
  );
}

console.log(`Score: ${report.score}/100`);
console.log(`Exit code: ${report.exitCode}`);

// Render any reporter format. `format()` takes a ReporterInput,
// which you assemble from the report.
process.stdout.write(
  format(
    {
      toolName: '@geoql/vue-doctor',
      toolVersion: '0.1.0',
      rootDirectory: report.rootDir,
      analyzedFileCount: report.filesScanned,
      elapsedMs: report.elapsedMs,
      diagnostics: report.diagnostics,
      score: report.scoreResult,
      projectInfo: report.projectInfo,
    },
    'agent',
  ),
);
```

Severity is `error | warn | info` throughout. `failOn` accepts `error | warn | none`.

### Key exports

| Export                                                  | Purpose                                                                           |
| ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `audit`                                                 | Run the two-pass scan and return the full report.                                 |
| `format`                                                | Render a report as `agent`, `pretty`, `json`, `json-compact`, `sarif`, or `html`. |
| `loadDoctorConfig`, `defineConfig`, `mergeCliOverrides` | Load `doctor.config.ts` (via `c12`) and layer CLI overrides on top.               |
| `detectProject`                                         | Detect framework, versions, and capability tokens used to gate rules.             |
| `listRules`, `RULE_REGISTRY`, `loadRuleDoc`             | Inspect the rule registry and per-rule docs.                                      |
| `scoreDiagnostics`                                      | Deterministic 0–100 scoring with the breakdown.                                   |
| `listChangedFiles`                                      | Resolve diff/staged file scopes for incremental runs.                             |
| `encodeAnnotations`                                     | Emit GitHub Actions `::error::` / `::warning::` lines.                            |

Types ship alongside (`AuditConfig`, `AuditReport`, `Diagnostic`, `Severity`, `ReporterFormat`, `ProjectInfo`, `ScoreResult`, and more).

## Scope

Vue 3 and Nuxt 4 only. Nuxt detection expects the `app/` directory layout with `compatibilityVersion: 4`.

## Architecture

See [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) for the full two-pass design, the empirical oxlint findings that shaped it, and the canonical `Diagnostic` shape.

## License

MIT © Vinayak Kulkarni
