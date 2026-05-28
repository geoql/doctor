# Architecture

**Status:** Locked (2026-05-28) — supersedes [`docs/SPEC.md`](./SPEC.md) §6 rule architecture.
**Owner:** Vinayak Kulkarni
**Last empirical validation:** oxlint `1.67.0` + `@vue/compiler-sfc` `3.5.35` (subprocess spike, 2026-05-28)

This document is the source of truth for how `@geoql/doctor` is built. `SPEC.md` remains useful for product goals, rule catalog ideas, output format, and the 66-issue backlog, but its rule-implementation model (pure JS plugin) was superseded by the findings below.

---

## 1. Key finding that shaped the architecture

oxlint ships **native Vue support in Rust core**:

- `loader/partial_loader/vue.rs` extracts `<script>` from `.vue` SFCs (same partial-loader pattern handles `.astro`, `.svelte`).
- `rules/vue/*` ships ~30+ built-in Vue rules: `define-props-destructuring`, `max-props`, `require-typed-ref`, `no-arrow-fns-in-watch`, `valid-define-props`, `prefer-import-from-vue`, `no-export-in-script-setup`, `no-expose-after-await`, and most `no-deprecated-*` from `eslint-plugin-vue`.
- Activated via `--vue-plugin` CLI flag or `"plugins": ["vue"]` in `.oxlintrc.json`.
- oxlint ships **zero** Nuxt rules.

A pure react-doctor model (re-implement every rule as a JS plugin rule) would be wrong for Vue: it'd duplicate ~30 rules oxlint already enforces faster and natively. The locked design leverages built-in rules and only writes JS-plugin rules for genuine gaps.

---

## 2. The hybrid two-pass design

```
┌──────────────────────────────────────────────────────────────────┐
│                         vue-doctor (CLI)                          │
│                 cac → load config → call doctor-core              │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                        @geoql/doctor-core                         │
│                                                                   │
│  Pass 1 — Template AST            Pass 2 — Script ESTree          │
│  ┌─────────────────────────┐      ┌────────────────────────────┐  │
│  │ @vue/compiler-sfc       │      │ spawn oxlint (subprocess)  │  │
│  │   parse() per .vue      │      │   - generated .oxlintrc    │  │
│  │   walk template AST     │      │   - "plugins":["vue"]      │  │
│  │   in-process rules:     │      │   - "jsPlugins":[…/        │  │
│  │   - v-for-has-key       │      │       vue-doctor-plugin]   │  │
│  │   - v-if-v-for-prec.    │      │   - built-in vue rules     │  │
│  │   - …                   │      │   - custom JS rules        │  │
│  └─────────────────────────┘      └────────────────────────────┘  │
│                │                                  │                │
│                └───────────┬──────────────────────┘                │
│                            ▼                                       │
│                  merge + dedupe diagnostics                        │
│                            │                                       │
│                            ▼                                       │
│                deterministic score (0–100)                         │
│                            │                                       │
│                            ▼                                       │
│        reporters: text │ json │ (sarif + annotations later)        │
└──────────────────────────────────────────────────────────────────┘
```

### Why two passes

oxlint JS plugins **only receive `<script>`/`<script setup>` ESTree** for `.vue` files — never the template AST. Empirically verified in the spike (2026-05-28):

```
src/Test.vue:3:8  error vue(no-export-in-script-setup): <script setup>` cannot contain ES module exports.
src/Test.vue:2:14 error vue-doctor(no-em-dash-in-string): Em dash in string literal reads as AI-generated output.
src/plain.ts:1:24 error vue-doctor(no-em-dash-in-string): Em dash in string literal reads as AI-generated output.
```

That proves built-ins + custom JS plugin co-load and both fire against extracted Vue script. Template-level rules (`v-for` missing `:key`, `v-if` + `v-for` on the same node, inline event handlers, dynamic-component without `:is`) require the template AST and live in Pass 1, in-process via `@vue/compiler-sfc`.

### Why subprocess (not in-process)

oxlint exposes a Node binary (`./node_modules/.bin/oxlint`) and a stable JSON-output mode. Calling it as a subprocess from `doctor-core`:

- Avoids depending on internal Rust crate APIs.
- Lets us upgrade oxlint independently of doctor-core's TS surface.
- Matches react-doctor's proven pattern (`spawn-batches.ts`).

Tradeoff: per-batch process spin-up cost (~50ms). Acceptable for an audit tool that runs occasionally; not acceptable for editor-time linting. If we need editor-time later, swap to oxlint's in-process Node binding when stable.

---

## 3. Package layout (locked)

```
packages/
├── doctor-core/                              # @geoql/doctor-core
│   ├── src/
│   │   ├── audit.ts                          # main entry: audit(rootDir, config) → Report
│   │   ├── template/
│   │   │   ├── parse-sfc.ts                  # @vue/compiler-sfc wrapper, caches per file
│   │   │   ├── walk.ts                       # generic template AST walker
│   │   │   ├── rules/
│   │   │   │   ├── v-for-has-key.ts
│   │   │   │   ├── v-if-v-for-precedence.ts
│   │   │   │   └── index.ts                  # rule registry (template pass)
│   │   │   └── report.ts                     # template rule → Diagnostic adapter
│   │   ├── oxlint/
│   │   │   ├── generate-config.ts            # .oxlintrc.json with vue + jsPlugins
│   │   │   ├── resolve-plugin.ts             # find oxlint-plugin-vue-doctor on disk
│   │   │   ├── spawn.ts                      # run oxlint --format=json, parse output
│   │   │   └── diagnostic.ts                 # oxlint output → Diagnostic adapter
│   │   ├── diagnostic.ts                     # canonical Diagnostic shape (both passes)
│   │   ├── merge-diagnostics.ts              # dedupe by file/line/col/ruleId
│   │   ├── score.ts                          # deterministic scoring 0–100
│   │   ├── reporters/
│   │   │   ├── text.ts
│   │   │   └── json.ts
│   │   ├── config.ts                         # c12-backed loader for doctor.config.ts
│   │   └── index.ts                          # public exports
│   ├── tests/                                # vitest
│   ├── vite.config.ts                        # vp pack
│   ├── tsconfig.json
│   ├── jsr.json
│   └── package.json
│
├── oxlint-plugin-vue-doctor/                 # @geoql/oxlint-plugin-vue-doctor
│   ├── src/
│   │   ├── plugin.ts                         # default export: { meta:{name}, rules }
│   │   ├── define-rule.ts                    # rule-authoring helper
│   │   ├── rule-types.ts                     # Rule, RuleContext (mirrors react-doctor shape)
│   │   ├── rules/
│   │   │   └── ai-slop/
│   │   │       └── no-em-dash-in-string.ts
│   │   └── index.ts
│   ├── tests/
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── jsr.json
│   └── package.json
│
└── vue-doctor/                               # @geoql/vue-doctor (CLI)
    ├── src/
    │   ├── cli.ts                            # cac wiring
    │   ├── bin.ts                            # shebang entry → cli.ts
    │   └── index.ts
    ├── vite.config.ts
    ├── tsconfig.json
    ├── jsr.json
    └── package.json
```

Two packages are explicitly **out of scope** for the alpha and deferred to v0.2+: `@geoql/oxlint-plugin-nuxt-doctor` and `@geoql/nuxt-doctor`. Nuxt support is a multi-session build per Oracle.

---

## 4. The canonical `Diagnostic` shape

Both passes produce diagnostics in this shape; the merge step dedupes on `(file, line, column, ruleId)`:

```ts
export interface Diagnostic {
  file: string; // absolute path
  line: number; // 1-indexed
  column: number; // 1-indexed
  endLine?: number;
  endColumn?: number;
  ruleId: string; // e.g. "vue/no-export-in-script-setup", "vue-doctor/template/v-for-has-key"
  severity: 'error' | 'warning';
  message: string;
  source: 'template' | 'oxlint'; // which pass produced it
  recommendation?: string; // optional fix hint, never an auto-applied fix
}
```

---

## 5. Deterministic scoring

100 minus weighted findings. Weights are constants in `score.ts`, never tunable from user config (determinism):

```
errors:    -10 each
warnings:  -2  each
floor:     0
```

This is intentionally crude for the alpha; later versions can add per-rule weights and per-category caps. The point is determinism — same code in, same score out, no randomness, no rounding ambiguity.

---

## 6. Config file (`doctor.config.ts`)

Loaded via `c12`. Minimum useful schema:

```ts
export interface DoctorConfig {
  rootDir?: string; // default: cwd
  include?: string[]; // default: ["**/*.vue", "**/*.ts", "**/*.tsx"]
  exclude?: string[]; // default: ["node_modules", "dist", ".nuxt", ".output", "coverage"]
  rules?: Record<string, 'error' | 'warning' | 'off'>;
  failOn?: 'error' | 'warning'; // CLI exit-code threshold
}
```

---

## 7. The CLI surface (alpha)

```
vue-doctor [path] [--format text|json] [--config doctor.config.ts] [--fail-on error|warning]
```

Alpha exit codes:

| Code | Meaning                                                     |
| ---- | ----------------------------------------------------------- |
| 0    | No findings at/above `--fail-on` threshold (default: error) |
| 1    | Findings at/above threshold                                 |
| 2    | Configuration error or scan failure                         |

`SPEC.md` §10 lists ~14 additional flags (`--diff`, `--staged`, `--full`, `--explain`, `--annotations`, `--pr-comment`, `--respect-inline-disables`, etc.). Those land in v0.2+ per the issue tracker.

---

## 8. What ships in v0.1.0-alpha

| Component           | Rules / Capabilities                                                         |
| ------------------- | ---------------------------------------------------------------------------- | ---------------------- | --------- |
| Template pass       | `template/v-for-has-key`, `template/v-if-v-for-precedence`                   |
| oxlint built-ins on | `vue/no-export-in-script-setup`, `vue/require-typed-ref`                     |
| JS plugin rules     | `ai-slop/no-em-dash-in-string`                                               |
| Reporters           | text, json                                                                   |
| CLI                 | `vue-doctor [path] --format <text                                            | json> --fail-on <error | warning>` |
| Smoke test          | `npx vue-doctor ./fixture` → emits diagnostics, deterministic score, exits 1 |

Everything else in `SPEC.md` §4 (rule catalog), §7 (output format extensions), §10 (advanced flags) lands incrementally per the GitHub issue backlog.

---

## 9. Empirical validation log

**Spike: 2026-05-28** (`/tmp/oxlint-spike`, deleted post-validation)

- oxlint `1.67.0` (`./node_modules/.bin/oxlint`, npm)
- `.oxlintrc.json`:
  ```json
  {
    "plugins": ["vue"],
    "jsPlugins": ["./vue-doctor-plugin.js"],
    "rules": {
      "vue/no-export-in-script-setup": "error",
      "vue-doctor/no-em-dash-in-string": "error"
    }
  }
  ```
- Plugin shape:
  ```js
  export default {
    meta: { name: 'vue-doctor' },
    rules: { 'no-em-dash-in-string': { create(context) { return { Literal(node){…} } } } },
  };
  ```
- Result: 3 diagnostics on `src/Test.vue` + `src/plain.ts` (1 built-in, 2 custom). Custom rule fired on extracted `.vue` `<script setup>` and on plain `.ts`. ✅

This validates: (a) `jsPlugins` field loads file-path plugins, (b) custom + built-in coexist, (c) `.vue` `<script>` extraction works for custom plugins, (d) `Literal` visitor + `context.report({node,message})` API behaves like ESLint.

---

## 10. References

- [`docs/SPEC.md`](./SPEC.md) — original product spec (rule catalog, output format, advanced flag list).
- [millionco/react-doctor](https://github.com/millionco/react-doctor) — reference implementation (subprocess pattern, plugin shape, defineRule).
- [oxc-project/oxc](https://github.com/oxc-project/oxc) — `crates/oxc_linter/src/rules/vue/*` for built-in Vue rule catalog.
- [oxlint JS plugins announcement (2026-03-11)](https://oxc.rs/blog/2026-03-11-oxlint-js-plugins-alpha)
- [Vue SFC parser](https://github.com/vuejs/core/tree/main/packages/compiler-sfc) — `@vue/compiler-sfc` `parse()` returns SFCDescriptor with `template.ast`.
