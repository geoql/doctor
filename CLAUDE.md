# CLAUDE.md — @geoql/doctor

> **For AI Assistants (Claude Code, Cursor, OpenCode, etc.)**
> This file is the single source of truth for the `@geoql/doctor` monorepo. When this file conflicts with generic skills, generic agent defaults, or your training data, **this file wins**. Read it before writing any code.

---

## Project Overview

**`@geoql/doctor`** is a 5-package pnpm monorepo of CLI tools and `oxlint` plugins that **audit Vue 3 + Nuxt 4 codebases** for performance, correctness, security, and AI-agent anti-patterns. It does NOT generate, scaffold, or render — it _critiques_ the code your agent just wrote.

| Package                              | Type             | Purpose                                                                                                                                                                          |
| ------------------------------------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/doctor-core`               | library          | Audit engine: scoring, reporters, hybrid two-pass (template AST via `@vue/compiler-sfc` + `oxlint` subprocess). Depends on both oxlint plugins as `workspace:*` / `workspace:^`. |
| `packages/oxlint-plugin-vue-doctor`  | oxlint JS plugin | Vue 3 anti-patterns (reactivity leaks, AI-slop, composition errors, perf). Loaded via oxlint's `jsPlugins`.                                                                      |
| `packages/oxlint-plugin-nuxt-doctor` | oxlint JS plugin | Nuxt 4 anti-patterns (hydration traps, server-route mistakes, AI-slop). Pairs with the Vue plugin.                                                                               |
| `packages/vue-doctor`                | CLI              | `npx -y @geoql/vue-doctor` — runs `doctor-core` over a Vue 3 project.                                                                                                            |
| `packages/nuxt-doctor`               | CLI              | `npx -y @geoql/nuxt-doctor` — runs `doctor-core` over a Nuxt 4 project.                                                                                                          |

**Scope is deliberately narrow:** Vue 3 only, Nuxt 4 only (`compatibilityVersion: 4`, `app/` dir). There is no Nuxt 3 support, no Vue 2 support, and **no compatibility shims** — do not add them.

The author of this repo is also the primary downstream consumer; correctness > coverage > ergonomics.

---

## Tech Stack & Tooling

| Layer           | Choice                                                  | Notes                                                                                                                                                                                                                       |
| --------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language        | TypeScript only                                         | `tsconfig.base.json`: `target: esnext`, `module: esnext`, `moduleResolution: bundler`, `strict: true`                                                                                                                       |
| Build           | **vite-plus** (`vp`)                                    | Root `vite.config.ts` carries only `lint:` + `fmt:` blocks. Each `packages/*/vite.config.ts` carries a `pack:` block with `platform: 'neutral'`, `format: ['esm']`, `dts: true`.                                            |
| Lint            | oxlint (via `vp lint`)                                  | Plugins: root = `['typescript','vue','import']`; per-package = `['typescript','import']`. No `rules` block — vite-plus's `vp lint` ignores it; rule levels come from the enabled plugins' defaults.                         |
| Format          | oxfmt (via `vp fmt`)                                    | `singleQuote: true`; `trailingComma: 'all'`; `lf` line endings                                                                                                                                                              |
| Tests           | vitest 4 (merged v8)                                    | Root `vitest.config.ts` defines `projects: ['packages/*', 'scripts']`. 100% thresholds on `packages/*/src/**/*.ts`. `scripts/` and `packages/benchmark/` are excluded from the coverage gate.                               |
| Package manager | **pnpm v11.4.0** (pinned)                               | `.nvmrc` = `24`. Never use `bunx`, never use `npm` for tasks.                                                                                                                                                               |
| Commit linting  | commitlint + husky + lint-staged                        | Husky `commit-msg` runs `pnpm exec commitlint --edit` and injects a `Signed-off-by` trailer from `git config user.{name,email}`.                                                                                            |
| Release         | release-please (manifest mode, `node-workspace` plugin) | One PR per release, covers all 5 packages.                                                                                                                                                                                  |
| Publishing      | **npm** + **JSR** in parallel                           | `pnpm pack` + `npm publish <tarball> --provenance --access public --tag <tag>` for npm. Per-package `jsr.json` synced via `scripts/bump-jsr-version.ts`.                                                                    |
| Provenance      | GitHub OIDC                                             | `--provenance` REQUIRES the GH repo to be public and the package to already exist on npm (OIDC cannot create never-published packages).                                                                                     |
| Linter runtime  | oxlint 1.67.0                                           | Bundled by vite-plus. The bare `node_modules/.bin/oxlint` is the vite-plus IDE wrapper and hard-exits 1 — always invoke `vp lint` or call the real `oxlint@<ver>/node_modules/oxlint/bin/oxlint` from a pnpm-resolved path. |

---

## ⛔ CRITICAL RULES — NEVER VIOLATE THESE

> **STOP AND READ BEFORE WRITING ANY CODE**
> These rules are NON-NEGOTIABLE. Violating them causes silent failures (lint passes, plugin exits 1; tests pass, coverage gate is red; publish succeeds, package is broken on import).

### 🚨 Rule #1: TypeScript Only — No `any`, No Escape Hatches

- **No `any`.** Use `unknown` + narrowing, or a real type.
- **No `@ts-ignore`**, no `@ts-expect-error`, no `@ts-nocheck`. Fix the type, don't paper over it.
- **No `as any`**, no `any[]`, no `Array<any>`, no `Record<K, any>`, no generic `<any>`.

```ts
// ❌ WRONG
const payload: any = response.body;
const items: any[] = await listAll();
const out = data as any;

// ✅ CORRECT
const payload = response.body as AuditReport; // narrow via Zod/oxlint/types
const items: Diagnostic[] = await listAll();
const out = structuredClone(data) as AuditConfig;
```

> **Enforcement:** TypeScript `strict: true` enforces `noImplicitAny`, and the repo is provably `any`-free (verified by grep across all `src`/`tests`/`scripts`). Note: `vp lint` (vite-plus) does NOT honor a `rules` block, so `typescript/no-explicit-any` cannot be turned on through `vite.config.ts` — explicit `any` is held out by convention + `strict` tsc + the 100% coverage gate + code review. Reviewers MUST grep the diff for `any` (see Code Review Checklist).

### 🚨 Rule #2: vite-plus Owns Tooling — Use `vp` Wrappers, Never Direct Binaries

- **Never** add `vite`, `@vitejs/plugin-vue`, `oxlint`, `oxfmt`, or any of their plugins as a direct devDep. vite-plus provides them; adding them causes duplicate installs and IDE/CI version drift.
- **All scripts use `vp`:** `vp lint`, `vp fmt`, `vp pack`, `vp test run`. Never `npx prettier`, never `vitest run` directly, never `oxlint .` directly.
- The bare `node_modules/.bin/oxlint` is the vite-plus IDE wrapper that hard-exits 1 in standalone mode — **never** invoke it for e2e rule verification. Spawn the real binary at `node_modules/.pnpm/oxlint@<ver>*/node_modules/oxlint/bin/oxlint`.
- **`vp lint` with no args or with multiple path args can silently exit 1.** Use `vp lint packages` for the whole tree, or `vp lint src` inside a per-package script.

### 🚨 Rule #3: oxlint Plugin AST — Never Manually Recurse

**oxlint 1.6x runtime nodes carry a `parent` back-reference** (a cycle). Iterating with `Object.keys(node)` and recursing visits `parent` and blows the stack:

```
RangeError: Maximum call stack size exceeded
  ... silently swallowed as oxlint/unknown
```

**Always** register a `visitor` keyed by the inner AST node type, and let oxlint own the traversal. Use `enter`/`:exit` stacks for state, never `for (const key of Object.keys(node))`.

```ts
// ❌ WRONG — manual recursion follows node.parent → cycle
function walk(node) { for (const k of Object.keys(node)) if (node[k]?.type) walk(node[k]); }

// ✅ CORRECT — declare visitors, oxlint drives traversal
create(context) {
  const stack = [];
  return {
    CallExpression: (n) => { stack.push(n); },
    'CallExpression:exit': () => { stack.pop(); },
  };
}
```

- **Per-prop diagnostics use `prop.loc`, not `el.loc`** — `el.loc` collapses multiple findings via the `file|line|column|ruleId` dedup key.
- **Project-level post-check rules** must short-circuit `return []` when `projectInfo.packageJsonPath === null` — otherwise the resolver escapes into outer dirs and crashes on fixtures with no project files.

### 🚨 Rule #4: Fixable Rules — `defineRule` Auto-Attaches `meta.fixable: 'code'`

Rules that ship a `fix` function get `meta.fixable: 'code'` **automatically** via the `defineRule` wrapper (`src/define-rule.ts`), which also bridges `rule.fix(node) → string | null` into oxlint's native `context.report({ fix(fixer) })`. Returning `null` reports without a fixer, so source is never corrupted. **Always use `defineRule` for fixable rules** — a bare `Rule` that emits `fix` ranges has them silently dropped by oxlint.

### 🚨 Rule #5: `generateOxlintConfig` MUST Allowlist Rule IDs

`generateOxlintConfig` (`src/oxlint/generate-config.ts`) writes a temporary `.oxlintrc.json`. **It must only emit rule ids actually registered** in the loaded `jsPlugins` — enforced by the `VUE_OXLINT_RULE_IDS` / `NUXT_OXLINT_RULE_IDS` allowlists. Emitting a phantom id makes oxlint exit 1 with "rule not found", which kills the entire script pass with **zero diagnostics** — a silent failure. When you add a rule to a plugin, **add its id to the matching allowlist on the same commit.**

### 🚨 Rule #6: Severity Vocabulary + Wire Boundary + √-Decay Score

- Internal severities (`src/types.ts`): `error | warn | info`. Weights: `error=5`, `warn=2`, `info=0.5`.
- The **oxlint wire boundary** (`OxlintRawDiagnostic.severity`) stays `error | warning` — only the internal type uses `info`. Conversion is in `toOxlintSeverity()`.
- Score uses **√-decay**: `penalty += weight × (i === 0 ? 1 : 1/√(i+1))` per occurrence grouped by ruleId; `score = max(0, round(100 − penalty))`. The score is part of the public `@geoql/doctor-core` contract — do not change the formula without amending SPEC.md first.
- `FailOn` = `error | warn | none`. Invalid `--fail-on` → CLI exit 2 (no silent fallback). Default `error`.

### 🚨 Rule #7: 100% Coverage Gate — Read the Output Before Committing

`vitest.config.ts` enforces 100% on **statements / branches / functions / lines** for `packages/*/src/**/*.ts`. `scripts/` and `packages/benchmark/` are excluded.

**Before committing, run `pnpm run coverage` and read the entire output.** A red gate means **do not commit**.

**Known flake:** `packages/doctor-core/tests/spawn-hardening.test.ts` ("SIGKILLs the sleeping child on timeout") flakes under full parallel load. Confirm it's the flake, not a regression:

```bash
rm -rf coverage/.tmp
pnpm --filter @geoql/doctor-core test spawn-hardening
```

If it passes in isolation, it was the flake.

### 🚨 Rule #8: TDD + `.ts` Test Filenames + Real `oxlint` Binary

- **Every behavior change is test-first** (RED → GREEN → refactor).
- **oxlint plugin rule tests MUST use `.ts` filenames.** The `runRule` harness uses `oxc-parser`, which **disables TypeScript syntax for `.vue` filenames** — TS-only nodes (`TSAsExpression`, `TSNonNullExpression`, …) vanish and the test passes for the wrong reason (zero reports).
- **E2E rule verification spawns the real oxlint binary** (see Rule #2), with the assertion "diagnostics match the fixture's expected output".

### 🚨 Rule #9: Type Co-Location — Per-Rule State Stays Co-Located

Per-rule single-use state types live next to the rule file. Only types that cross module boundaries go to a shared types location.

```ts
// ❌ WRONG — per-rule state type dumped in a shared types file
// ✅ CORRECT — co-located at the top of the rule file (e.g. WatchFrame in watch-without-cleanup.ts)
```

This is the **opposite** of the convention in the author's Vue/Nuxt app repos — do not import their convention here; doctor is a CLI/library monorepo.

### 🚨 Rule #10: Conventional Commits + `Signed-off-by` + No AI Mention + No `bunx`

- **Conventional Commits** (commitlint): `feat | fix | perf | revert | docs | chore | refactor | test | build | ci`. Subject lowercase, imperative.
- **`Signed-off-by` trailer is mandatory** — injected by `.husky/commit-msg` from `git config user.{name,email}`. Canonical author email: `19776877+vinayakkulkarni@users.noreply.github.com`.
- **NEVER add `Co-Authored-By: Claude` or any AI attribution.** The author owns the diff.
- **NEVER use `bunx`** — husky hooks, lint-staged, scripts, release steps. Use `pnpm exec` / `pnpm dlx`.
- **NEVER force-push to a pushed branch without explicit authorization.** HTTPS force-push (and gh Contents/Git-Data API writes) to a diff touching `.github/workflows/` is **blocked** (gh token lacks `workflow` scope) — use SSH for those.

### 🚨 Rule #11: Publish — `pnpm pack` + OIDC + Bootstrap First-Timers + JSR Linking

- **npm publish uses `pnpm pack` (NOT `pnpm publish`).** `pnpm pack` rewrites `workspace:^`/`workspace:*` to real semver in the tarball; `pnpm publish` does not perform the npm OIDC token-exchange.

  ```bash
  pnpm pack --pack-destination .release/
  npm publish .release/geoql-<pkg>-<ver>.tgz --provenance --access public --tag <tag>
  ```

- **`--provenance` requires the GH repo to be public** and the package to already exist on npm. **OIDC cannot create a never-published package** — bootstrap once with a personal npm token, then configure a Trusted Publisher on npmjs.com (GitHub Actions · `geoql/doctor` · workflow `release-please.yml` · env `npm`).
- **Prerelease versions REQUIRE `--tag`** (e.g. `alpha`, `next`).
- **oxlint-plugin `publishConfig` is `{ "access": "public" }` only** — no `provenance: true` locally (OIDC env supplies it).
- **JSR**: each package has a `jsr.json` synced by `scripts/bump-jsr-version.ts` (covers all 5). Packages must be manually created + linked on jsr.io before first publish. The two CLI packages need an `imports` map (`"@geoql/doctor-core": "jsr:@geoql/doctor-core@^x"`) in `jsr.json`, plus doctor-core's static deps added as their `devDependencies` so deno's byonm resolver finds the transitive npm deps.
- **Add postinstall-having deps to `pnpm-workspace.yaml` `allowBuilds`** (`@parcel/watcher`, `esbuild`, `unrs-resolver`) — frozen-install CI fails otherwise.

### 🚨 Rule #12: SPEC.md Is the Locked Spec

`docs/SPEC.md` is the single locked spec (rule IDs, severities, scoring, CLI flags, JSON shape, AND the hybrid multi-pass engine design in §10). **Never normalize the SPEC down to match a shortcut.** Code migrates to the SPEC, not the reverse. When SPEC and code disagree, the SPEC wins until amended.

### 🚨 Rule #13: Dependency Hygiene

- **Always run `npm view <dep> version` before pinning** any dependency.
- Bump with `pnpm dlx taze major -l -w -r` (include-locked, write, recursive), then `pnpm install --no-frozen-lockfile`.
- `vue-tsc` must remain a devDep in any library root that vite-plus-core's `loadVueLanguageTools` touches.
- Never pin `"latest"`.

---

## Monorepo Structure

```
geoql/doctor/
├── packages/
│   ├── doctor-core/                       # @geoql/doctor-core — audit engine
│   │   └── src/{audit,score,types}.ts, oxlint/, rules/, reporters/, config/
│   ├── oxlint-plugin-vue-doctor/          # @geoql/oxlint-plugin-vue-doctor
│   │   └── src/{plugin,define-rule,rule-types}.ts, rules/, shared/
│   ├── oxlint-plugin-nuxt-doctor/         # @geoql/oxlint-plugin-nuxt-doctor
│   │   └── src/rules/{ai-slop,data-fetching,hydration,server-routes}/
│   ├── vue-doctor/                        # @geoql/vue-doctor — CLI (bin/vue-doctor.mjs)
│   ├── nuxt-doctor/                        # @geoql/nuxt-doctor — CLI (bin/nuxt-doctor.mjs)
│   └── benchmark/                          # perf workspace (excluded from coverage gate)
├── scripts/bump-jsr-version.ts            # sync 5 × jsr.json from package.json
├── docs/SPEC.md                           # the single locked spec — do NOT normalize away
├── .github/workflows/                      # OIDC publish + CI (SSH-only writes)
├── .husky/{commit-msg,pre-commit}
├── pnpm-workspace.yaml                     # packages/* + allowBuilds
├── vite.config.ts                          # root: lint + fmt only (no pack)
├── vitest.config.ts                        # projects: [packages/*, scripts], 100% thresholds
├── release-please-config.json              # 5 packages, node-workspace
└── CLAUDE.md                               # this file
```

---

## Development Commands

```bash
pnpm install                 # frozen lockfile in CI
pnpm run lint                # = vp lint   (whole tree)
pnpm run format              # = vp fmt
pnpm run build               # vp pack per package
pnpm run test                # all package tests
pnpm run coverage            # vitest run --coverage — READ THE OUTPUT (Rule #7)
pnpm --filter @geoql/doctor-core test spawn-hardening   # isolated flake triage
node scripts/bump-jsr-version.ts                        # sync jsr.json before release
pnpm dlx taze major -l -w -r                             # dependency bump
```

---

## Git Commit Format

```
<type>(<scope>): <imperative subject, lowercase>

<body — why, not what>

Signed-off-by: Vinayak Kulkarni <19776877+vinayakkulkarni@users.noreply.github.com>
```

- `scope` ∈ `core | vue-plugin | nuxt-plugin | vue-cli | nuxt-cli | monorepo`.
- No `Co-Authored-By: Claude` or any AI attribution.
- The `Signed-off-by` trailer is auto-injected by `.husky/commit-msg` from local git config.

---

## Code Review Checklist

- [ ] No `any`, no `@ts-ignore`/`@ts-expect-error`/`@ts-nocheck` in the diff.
- [ ] Per-package `vite.config.ts` has only `lint:`/`pack:`(/`fmt:`) blocks — no separate `vitest.config.ts`/`.oxlintrc`/`.oxfmtrc`.
- [ ] No `vite`/`@vitejs/plugin-vue`/`oxlint`/`oxfmt` as direct devDeps.
- [ ] `pnpm run coverage` green (read the output, not just exit code); known spawn-hardening flake confirmed in isolation.
- [ ] New plugin rules added to the matching `*_OXLINT_RULE_IDS` allowlist in `generate-config.ts`.
- [ ] oxlint rule tests use `.ts` filenames; e2e spawns the real oxlint binary (not `.bin/oxlint`).
- [ ] No `Object.keys(node)` recursion over oxlint AST nodes (visitor pattern only).
- [ ] Fixable rules use `defineRule`; per-rule state types co-located (Rule #9).
- [ ] Project-level post-checks short-circuit on `packageJsonPath === null`.
- [ ] Commit has no AI attribution, has `Signed-off-by`, follows Conventional Commits; no `bunx`.
- [ ] `SPEC.md` not silently diverged; `allowBuilds` updated for new postinstall deps.

---

**Last updated:** 2026-06-03
**Maintainer:** @vinayakkulkarni
