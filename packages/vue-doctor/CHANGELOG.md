# Changelog

## [1.7.2](https://github.com/geoql/doctor/compare/vue-doctor-v1.7.1...vue-doctor-v1.7.2) (2026-07-28)


### Bug Fixes

* **deps:** bump oxc-parser from 0.140.0 to 0.142.0 ([#159](https://github.com/geoql/doctor/issues/159)) ([9390969](https://github.com/geoql/doctor/commit/93909691b898c0714d3e0fafb90017b1385d204d))
* **deps:** bump oxlint from 1.75.0 to 1.76.0 ([#165](https://github.com/geoql/doctor/issues/165)) ([4888d34](https://github.com/geoql/doctor/commit/4888d347674cfddd8a12e94997358fc0a64e986a))


### Miscellaneous

* **deps-dev:** bump @types/node from 26.1.1 to 26.1.2 ([#164](https://github.com/geoql/doctor/issues/164)) ([2051941](https://github.com/geoql/doctor/commit/205194172b5c06f49683cf4a326724cca62c5a4b))
* **deps:** bump dependencies ✨ ([3cf3f9d](https://github.com/geoql/doctor/commit/3cf3f9df15819e0370cc0a309d36c79208c6c35c))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-core bumped to 1.8.2
    * @geoql/oxlint-plugin-vue-doctor bumped to 1.4.1

## [1.7.1](https://github.com/geoql/doctor/compare/vue-doctor-v1.7.0...vue-doctor-v1.7.1) (2026-07-27)


### Bug Fixes

* **core:** stop flagging v-for alias .value as a ref deref ([c961c62](https://github.com/geoql/doctor/commit/c961c62c764831dc69e78aa69473937a3d8a115e))
* **core:** stop flagging variant selectors and JS brackets as arbitrary values ([899cc31](https://github.com/geoql/doctor/commit/899cc31c00d9adbcb5275e7ab66430fb4ab24e1f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-core bumped to 1.8.1

## [1.7.0](https://github.com/geoql/doctor/compare/vue-doctor-v1.6.0...vue-doctor-v1.7.0) (2026-07-27)


### Features

* **core:** wave-1 anti-slop design rules (react.doctor 0.8.x parity) ([276b5eb](https://github.com/geoql/doctor/commit/276b5eb20b9fe74072ed8d1aa1093c9dccc1c0b1))
* design subcommand (shadscan-vue) + test-surface score exclusion ([216a8dc](https://github.com/geoql/doctor/commit/216a8dc91eefd5bf0e450f87b4280ae8eb8f3b79))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-core bumped to 1.8.0

## [1.6.0](https://github.com/geoql/doctor/compare/vue-doctor-v1.5.0...vue-doctor-v1.6.0) (2026-07-26)


### Features

* --push-workspace flag for monorepo score series ([50cac92](https://github.com/geoql/doctor/commit/50cac9299654a969f439b3877dd3913dcd92b99b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-core bumped to 1.7.0

## [1.5.0](https://github.com/geoql/doctor/compare/vue-doctor-v1.4.2...vue-doctor-v1.5.0) (2026-07-15)


### Features

* **monorepo:** add --changed-files-from and --include-untracked git-scope flags ([d007899](https://github.com/geoql/doctor/commit/d0078996df4574ff046743a00bf250ca5a0236a3))


### Bug Fixes

* **deps:** bump oxc-parser from 0.139.0 to 0.140.0 ([#143](https://github.com/geoql/doctor/issues/143)) ([0b91ca6](https://github.com/geoql/doctor/commit/0b91ca6fc8afaa15462b5e83a6bdc09c8d608772))
* **deps:** bump oxlint from 1.73.0 to 1.74.0 ([#144](https://github.com/geoql/doctor/issues/144)) ([5ac15f2](https://github.com/geoql/doctor/commit/5ac15f2fae678532d1d22ed083464a7371d6bf4e))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-core bumped to 1.6.0
    * @geoql/oxlint-plugin-vue-doctor bumped to 1.4.0

## [1.4.2](https://github.com/geoql/doctor/compare/vue-doctor-v1.4.1...vue-doctor-v1.4.2) (2026-07-12)


### Bug Fixes

* **deps:** bump oxc-parser from 0.138.0 to 0.139.0 ([#127](https://github.com/geoql/doctor/issues/127)) ([e665f80](https://github.com/geoql/doctor/commit/e665f8026fc0485d1c06bb0a6a6519aaab79a287))


### Miscellaneous

* **deps-dev:** bump vitest from 4.1.9 to 4.1.10 ([#128](https://github.com/geoql/doctor/issues/128)) ([f2762e0](https://github.com/geoql/doctor/commit/f2762e085e2fadf2e44655c9c41cceb1a370c8fa))
* **monorepo:** bump deps (oxlint 1.73, vite-plus 0.2.4, vitest coverage 4.1.10, pnpm 11.11) ([6e78255](https://github.com/geoql/doctor/commit/6e7825577a4afff70183fb6ef9d1a3b72836f879))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-core bumped to 1.5.0
    * @geoql/oxlint-plugin-vue-doctor bumped to 1.3.0

## [1.4.1](https://github.com/geoql/doctor/compare/vue-doctor-v1.4.0...vue-doctor-v1.4.1) (2026-07-06)


### Bug Fixes

* **deps:** bump oxc-parser from 0.137.0 to 0.138.0 ([#120](https://github.com/geoql/doctor/issues/120)) ([f65c6f2](https://github.com/geoql/doctor/commit/f65c6f2176401736b36fe3b0eefc6c74b716c0fa))


### Documentation

* drop stale hardcoded v0.1.0 from package READMEs ([a98738f](https://github.com/geoql/doctor/commit/a98738fe778c383aba3d3460f7800b5a4db4d5a8))


### Miscellaneous

* **deps-dev:** bump @types/node from 25.9.4 to 26.1.0 ([#110](https://github.com/geoql/doctor/issues/110)) ([a9a08e5](https://github.com/geoql/doctor/commit/a9a08e5f328ab8b9905892c56edb38d8e6a7f202))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-core bumped to 1.4.1
    * @geoql/oxlint-plugin-vue-doctor bumped to 1.2.2

## [1.4.0](https://github.com/geoql/doctor/compare/vue-doctor-v1.3.3...vue-doctor-v1.4.0) (2026-07-05)


### Features

* react-doctor parity — frameworkDetected, ci install, --max-duration ([545bbb8](https://github.com/geoql/doctor/commit/545bbb8fc2d608e3be182dfad729edd34928f6e3))
* **vue-cli:** add `vue-doctor ci install` subcommand ([2d6c1c6](https://github.com/geoql/doctor/commit/2d6c1c6f5f1714d52749c3ec6db38648289bec3b))
* **vue-cli:** thread --max-duration &lt;seconds&gt; through vue-doctor audit ([950a5e8](https://github.com/geoql/doctor/commit/950a5e86cf01fe8ae8603e02ed536dc0703a6f2a))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-core bumped to 1.4.0

## [1.3.3](https://github.com/geoql/doctor/compare/vue-doctor-v1.3.2...vue-doctor-v1.3.3) (2026-07-01)


### Miscellaneous

* **monorepo:** bump oxlint/knip/eslint/vite + raise audit-test timeouts for oxlint 1.72 ([b65f7bf](https://github.com/geoql/doctor/commit/b65f7bfeff602f7881707191d0b5b01866b6e3da))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-core bumped to 1.3.3

## [1.3.2](https://github.com/geoql/doctor/compare/vue-doctor-v1.3.1...vue-doctor-v1.3.2) (2026-06-29)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-core bumped to 1.3.2

## [1.3.1](https://github.com/geoql/doctor/compare/vue-doctor-v1.3.0...vue-doctor-v1.3.1) (2026-06-28)


### Miscellaneous

* **monorepo:** bump vite 8.1, oxlint/oxfmt 1.71/0.56, knip 6.20, wrangler 4.105 ([828dbe6](https://github.com/geoql/doctor/commit/828dbe6b7c6e5287b7d2231b32169d59e0cdcebb))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-core bumped to 1.3.1
    * @geoql/oxlint-plugin-vue-doctor bumped to 1.2.1

## [1.3.0](https://github.com/geoql/doctor/compare/vue-doctor-v1.2.2...vue-doctor-v1.3.0) (2026-06-23)


### Features

* **core:** react.doctor parity — perf rules, dimension filters, sub-score ([a184d70](https://github.com/geoql/doctor/commit/a184d70d8e5edf4a6d5e1975cf5cfce394740140))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-core bumped to 1.3.0
    * @geoql/oxlint-plugin-vue-doctor bumped to 1.2.0

## [1.2.2](https://github.com/geoql/doctor/compare/vue-doctor-v1.2.1...vue-doctor-v1.2.2) (2026-06-21)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-core bumped to 1.2.1

## [1.2.1](https://github.com/geoql/doctor/compare/vue-doctor-v1.2.0...vue-doctor-v1.2.1) (2026-06-20)


### Bug Fixes

* **monorepo:** add zod to CLI byonm devDeps for JSR publish ([a87913a](https://github.com/geoql/doctor/commit/a87913a85041d40258fb8bc627274ce6aa9fa810))

## [1.2.0](https://github.com/geoql/doctor/compare/vue-doctor-v1.1.2...vue-doctor-v1.2.0) (2026-06-20)


### Features

* **core:** zod v4 config schema as single source of truth ([0cb3de1](https://github.com/geoql/doctor/commit/0cb3de11779e87ac2f542e0d66aeb6ba7565a4b2))
* **vue-cli,nuxt-cli:** add install command scaffolding the doctor agent skill ([9739ac6](https://github.com/geoql/doctor/commit/9739ac6a183d42c3dc8832302c4589034eac834f))
* **vue-cli,nuxt-cli:** add why/rules aliases for react.doctor parity ([0040477](https://github.com/geoql/doctor/commit/00404775bec79f4aa6d1d4d50699fbcd79bfe82c))


### Miscellaneous

* **deps:** bump dependencies, migrate lucide-vue-next to @lucide/vue ([f1e8f4a](https://github.com/geoql/doctor/commit/f1e8f4aa7e684ef7d8104150deee794f4ad3a204))


### Code Refactoring

* **monorepo:** migrate authored .mjs scripts to .ts and pin engines to node &gt;=24 ([ae3ec8d](https://github.com/geoql/doctor/commit/ae3ec8d9a10c8773c2d98478309b205a92b1c9ae))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-core bumped to 1.2.0
    * @geoql/oxlint-plugin-vue-doctor bumped to 1.1.0

## [1.1.2](https://github.com/geoql/doctor/compare/vue-doctor-v1.1.1...vue-doctor-v1.1.2) (2026-06-10)


### Bug Fixes

* **core:** [#91](https://github.com/geoql/doctor/issues/91) score/findings desync after allowedRuleIds filter ([2606aff](https://github.com/geoql/doctor/commit/2606aff02b7792372390e2d36bdb02910583947f))
* **core:** relativize pushed finding paths + point docs urls at docs.the-doctor.report ([542af7f](https://github.com/geoql/doctor/commit/542af7f4ac6bbf82b1da7303d2d9a71ef5a386e4))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-core bumped to 1.1.1

## [1.1.1](https://github.com/geoql/doctor/compare/vue-doctor-v1.1.0...vue-doctor-v1.1.1) (2026-06-09)


### Bug Fixes

* **monorepo:** bump JSR import-map pin to doctor-core@^1.0.0 ([a9c86ba](https://github.com/geoql/doctor/commit/a9c86ba1feea1e6ce55204c74373170c501e1403))
* **vue-cli,nuxt-cli:** add --push-project flag for SaaS slug ([b744bde](https://github.com/geoql/doctor/commit/b744bdee1553dc59dc3be0562407f44788eae99b))

## [1.1.0](https://github.com/geoql/doctor/compare/vue-doctor-v1.0.1...vue-doctor-v1.1.0) (2026-06-09)


### Features

* **vue-doctor:** wire --push flag to push privacy-stripped findings to the SaaS ([29d8005](https://github.com/geoql/doctor/commit/29d80052ff9bf3f6c58db0d5e01f629bdab8edad))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-core bumped to 1.1.0

## [1.0.1](https://github.com/geoql/doctor/compare/vue-doctor-v1.0.0...vue-doctor-v1.0.1) (2026-06-05)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-core bumped to 1.0.1

## [1.0.0](https://github.com/geoql/doctor/compare/vue-doctor-v0.1.1...vue-doctor-v1.0.0) (2026-06-04)


### Features

* first stable release — `npx @geoql/vue-doctor` CLI surface (flags, subcommands, reporters) is now API-stable


## [0.1.1](https://github.com/geoql/doctor/compare/vue-doctor-v0.1.0...vue-doctor-v0.1.1) (2026-06-02)


### Bug Fixes

* **jsr:** add doctor-core's static deps as CLI devDeps for byonm resolution ([1961569](https://github.com/geoql/doctor/commit/196156951b0b7f5f59446fe2a61e66c62dc80d2e))
* **jsr:** map @geoql/doctor-core to jsr specifier in CLI packages ([8d3f1d7](https://github.com/geoql/doctor/commit/8d3f1d767f0b4a6e5e8a977e110b43fec5157ee6))


### Documentation

* rewrite all 5 package READMEs to match shipped v0.1.0 surface ([dd56904](https://github.com/geoql/doctor/commit/dd569046aea56ba794a4e0d44bca864c51983e96))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-core bumped to 0.1.1
    * @geoql/oxlint-plugin-vue-doctor bumped to 0.1.1

## 0.1.0 (2026-06-02)


### ⚠ BREAKING CHANGES

* **doctor-core:** harden config loader per SPEC §8 ([#23](https://github.com/geoql/doctor/issues/23))
* **doctor-core:** 3-level severity + SPEC §7 √-decay score ([#19](https://github.com/geoql/doctor/issues/19))

### Features

* **core:** --fail-on=none + strict CLI validation (no silent fallback) ([8a8430c](https://github.com/geoql/doctor/commit/8a8430ceb831a26c720e535013952173a63fcd89))
* **core:** --format html reporter (self-contained, no external assets) ([dcd0f9f](https://github.com/geoql/doctor/commit/dcd0f9f88380e2affb4d52d02312b57c4fa683b3))
* **core:** real --preset infra (minimal/recommended/strict/all) ([28bb1f5](https://github.com/geoql/doctor/commit/28bb1f53555b90413a89b8711ac2cb3c2643311b))
* **core:** rule-docs scaffold + explain subcommand + SARIF fullDescription ([16332bd](https://github.com/geoql/doctor/commit/16332bd256701dcb8ceec1d38a37f0e87e6aecea))
* **doctor-core:** --verbose/--quiet observability + per-pass timings ([#29](https://github.com/geoql/doctor/issues/29)) ([b723b16](https://github.com/geoql/doctor/commit/b723b16aa73c4bb18510eb9383954a9d7f0a35ec))
* **doctor-core:** [#33](https://github.com/geoql/doctor/issues/33) sub-batch C1+C3 template/v-memo + no-inline-object-prop ([868d29a](https://github.com/geoql/doctor/commit/868d29a8a122ebd2fbcd12c016bf529086891471))
* **doctor-core:** [#33](https://github.com/geoql/doctor/issues/33) sub-batch D template-perf 2 rules ([898fcd7](https://github.com/geoql/doctor/commit/898fcd77f47113524b674fe4f3c6e1a9b368729e))
* **doctor-core:** [#33](https://github.com/geoql/doctor/issues/33) sub-batch E build-quality 4 post-checks ([2cbd57c](https://github.com/geoql/doctor/commit/2cbd57c736a22ad4c5f0dc44b3b67d56a905e55b))
* **doctor-core:** [#35](https://github.com/geoql/doctor/issues/35) SARIF v2.1.0 reporter for GitHub Code Scanning ([db3b9d1](https://github.com/geoql/doctor/commit/db3b9d1d750d7ca69ac0f54b487a50f2b690bc3c))
* **doctor-core:** add knip dead-code analysis pass ([#18](https://github.com/geoql/doctor/issues/18)) ([391e0a5](https://github.com/geoql/doctor/commit/391e0a58a01433865e5a5063341cb5a7528b7ee8))
* **doctor-core:** agent/pretty/json reporters per SPEC §6 ([#20](https://github.com/geoql/doctor/issues/20) [#21](https://github.com/geoql/doctor/issues/21) [#22](https://github.com/geoql/doctor/issues/22)) ([844f8ec](https://github.com/geoql/doctor/commit/844f8ecda4d049c5f0bc832bfa21e9952c8c55d1))
* **doctor-core:** harden config loader per SPEC §8 ([#23](https://github.com/geoql/doctor/issues/23)) ([b9fc3df](https://github.com/geoql/doctor/commit/b9fc3df0ce589c0dd28d77b5e48c54db63444102))
* **doctor-core:** hybrid two-pass audit pipeline ([427cde4](https://github.com/geoql/doctor/commit/427cde4a7e16155ed8524224c8303bb220d1ccd2)), closes [#16](https://github.com/geoql/doctor/issues/16)
* **doctor-core:** inline-disable directives + --no-respect-inline-disables ([#28](https://github.com/geoql/doctor/issues/28)) ([e8fa4ed](https://github.com/geoql/doctor/commit/e8fa4ed9229efcff239428c010504765399ac2d1))
* **packages:** scaffold doctor-core, oxlint-plugin-vue-doctor, vue-doctor ([#68](https://github.com/geoql/doctor/issues/68)) ([884a436](https://github.com/geoql/doctor/commit/884a4363fa17b7d39b7027950bf4b9f40f79d711))
* **rules:** add 3 ai-slop reactivity rules + fix bundled plugin resolution ([5e52e6a](https://github.com/geoql/doctor/commit/5e52e6acaa21e496dc81188716c6f137ee2b8f23))
* **vue-doctor:** --ci / --no-ci flag with CI environment auto-detect ([80434bc](https://github.com/geoql/doctor/commit/80434bc42400b51e21056e3727eecaf206379844))
* **vue-doctor:** [#38](https://github.com/geoql/doctor/issues/38) list-rules subcommand + rule registry ([2299669](https://github.com/geoql/doctor/commit/2299669527bd08ef71d64fe3754449f8722bbbde))
* **vue-doctor:** add --annotations + harden --threshold ([#30](https://github.com/geoql/doctor/issues/30)) ([7273910](https://github.com/geoql/doctor/commit/727391028cd577e1f9a644bd1b08d23baacbb1a0))
* **vue-doctor:** add --diff/--staged git scoping ([#27](https://github.com/geoql/doctor/issues/27)) ([d336fcb](https://github.com/geoql/doctor/commit/d336fcb1077dbddd68755f2b5ae92055723d1fc1))
* **vue-doctor:** add --full to force a complete scan ([#27](https://github.com/geoql/doctor/issues/27)) ([060dc25](https://github.com/geoql/doctor/commit/060dc25c7de5a4ebd53b6cc1f5d6e324a9ef3df8))
* **vue-doctor:** add --no-lint to skip the lint passes ([#26](https://github.com/geoql/doctor/issues/26)) ([3857d46](https://github.com/geoql/doctor/commit/3857d46f3f76b7e6b2da1ec6eb997d8307ccfe6a))
* **vue-doctor:** add --score flag for score-only output ([#31](https://github.com/geoql/doctor/issues/31)) ([071c997](https://github.com/geoql/doctor/commit/071c9974c59af83a6fef4507249579b09cb38f51))
* **vue-doctor:** add core/preset/output CLI flags ([#25](https://github.com/geoql/doctor/issues/25), [#26](https://github.com/geoql/doctor/issues/26), [#29](https://github.com/geoql/doctor/issues/29)) ([9010207](https://github.com/geoql/doctor/commit/9010207aeb329ce66ea2fee5054a582562f63246))
* **vue-doctor:** inspect subcommand for project capability introspection ([15ac185](https://github.com/geoql/doctor/commit/15ac18586b85789804374164d124493fc6d558c5))


### Bug Fixes

* **vue-doctor:** read CLI version from package.json + pin npm publish environment ([6d5f714](https://github.com/geoql/doctor/commit/6d5f7148c4d39ca88d61ab91e74e8fb09bebe327))
* **vue-doctor:** remove no-op --preset flag ([#25](https://github.com/geoql/doctor/issues/25)) ([39528ab](https://github.com/geoql/doctor/commit/39528ab209098112154a4882e6b54f270c84504a))


### Miscellaneous

* release main ([#79](https://github.com/geoql/doctor/issues/79)) ([df762b3](https://github.com/geoql/doctor/commit/df762b3c5cffaa52514c567d4c54dd6d9fd9bb47))
* **release:** v0.1.0-alpha.0 ([62fd9bb](https://github.com/geoql/doctor/commit/62fd9bbde387dafb1f8056f4fc00597c8e1031d6))


### Code Refactoring

* **doctor-core:** 3-level severity + SPEC §7 √-decay score ([#19](https://github.com/geoql/doctor/issues/19)) ([641a6c0](https://github.com/geoql/doctor/commit/641a6c045bbf3880bf45d0eba27908df3ea01139))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-core bumped to 0.1.0
    * @geoql/oxlint-plugin-vue-doctor bumped to 0.1.0

## [0.2.0-alpha.0](https://github.com/geoql/doctor/compare/vue-doctor-v0.1.0-alpha.0...vue-doctor-v0.2.0-alpha.0) (2026-05-31)


### ⚠ BREAKING CHANGES

* **doctor-core:** harden config loader per SPEC §8 ([#23](https://github.com/geoql/doctor/issues/23))
* **doctor-core:** 3-level severity + SPEC §7 √-decay score ([#19](https://github.com/geoql/doctor/issues/19))

### Features

* **core:** --fail-on=none + strict CLI validation (no silent fallback) ([8a8430c](https://github.com/geoql/doctor/commit/8a8430ceb831a26c720e535013952173a63fcd89))
* **core:** --format html reporter (self-contained, no external assets) ([dcd0f9f](https://github.com/geoql/doctor/commit/dcd0f9f88380e2affb4d52d02312b57c4fa683b3))
* **core:** real --preset infra (minimal/recommended/strict/all) ([28bb1f5](https://github.com/geoql/doctor/commit/28bb1f53555b90413a89b8711ac2cb3c2643311b))
* **core:** rule-docs scaffold + explain subcommand + SARIF fullDescription ([16332bd](https://github.com/geoql/doctor/commit/16332bd256701dcb8ceec1d38a37f0e87e6aecea))
* **doctor-core:** --verbose/--quiet observability + per-pass timings ([#29](https://github.com/geoql/doctor/issues/29)) ([b723b16](https://github.com/geoql/doctor/commit/b723b16aa73c4bb18510eb9383954a9d7f0a35ec))
* **doctor-core:** [#33](https://github.com/geoql/doctor/issues/33) sub-batch C1+C3 template/v-memo + no-inline-object-prop ([868d29a](https://github.com/geoql/doctor/commit/868d29a8a122ebd2fbcd12c016bf529086891471))
* **doctor-core:** [#33](https://github.com/geoql/doctor/issues/33) sub-batch D template-perf 2 rules ([898fcd7](https://github.com/geoql/doctor/commit/898fcd77f47113524b674fe4f3c6e1a9b368729e))
* **doctor-core:** [#33](https://github.com/geoql/doctor/issues/33) sub-batch E build-quality 4 post-checks ([2cbd57c](https://github.com/geoql/doctor/commit/2cbd57c736a22ad4c5f0dc44b3b67d56a905e55b))
* **doctor-core:** [#35](https://github.com/geoql/doctor/issues/35) SARIF v2.1.0 reporter for GitHub Code Scanning ([db3b9d1](https://github.com/geoql/doctor/commit/db3b9d1d750d7ca69ac0f54b487a50f2b690bc3c))
* **doctor-core:** add knip dead-code analysis pass ([#18](https://github.com/geoql/doctor/issues/18)) ([391e0a5](https://github.com/geoql/doctor/commit/391e0a58a01433865e5a5063341cb5a7528b7ee8))
* **doctor-core:** agent/pretty/json reporters per SPEC §6 ([#20](https://github.com/geoql/doctor/issues/20) [#21](https://github.com/geoql/doctor/issues/21) [#22](https://github.com/geoql/doctor/issues/22)) ([844f8ec](https://github.com/geoql/doctor/commit/844f8ecda4d049c5f0bc832bfa21e9952c8c55d1))
* **doctor-core:** harden config loader per SPEC §8 ([#23](https://github.com/geoql/doctor/issues/23)) ([b9fc3df](https://github.com/geoql/doctor/commit/b9fc3df0ce589c0dd28d77b5e48c54db63444102))
* **doctor-core:** hybrid two-pass audit pipeline ([427cde4](https://github.com/geoql/doctor/commit/427cde4a7e16155ed8524224c8303bb220d1ccd2)), closes [#16](https://github.com/geoql/doctor/issues/16)
* **doctor-core:** inline-disable directives + --no-respect-inline-disables ([#28](https://github.com/geoql/doctor/issues/28)) ([e8fa4ed](https://github.com/geoql/doctor/commit/e8fa4ed9229efcff239428c010504765399ac2d1))
* **packages:** scaffold doctor-core, oxlint-plugin-vue-doctor, vue-doctor ([#68](https://github.com/geoql/doctor/issues/68)) ([884a436](https://github.com/geoql/doctor/commit/884a4363fa17b7d39b7027950bf4b9f40f79d711))
* **rules:** add 3 ai-slop reactivity rules + fix bundled plugin resolution ([5e52e6a](https://github.com/geoql/doctor/commit/5e52e6acaa21e496dc81188716c6f137ee2b8f23))
* **vue-doctor:** --ci / --no-ci flag with CI environment auto-detect ([80434bc](https://github.com/geoql/doctor/commit/80434bc42400b51e21056e3727eecaf206379844))
* **vue-doctor:** [#38](https://github.com/geoql/doctor/issues/38) list-rules subcommand + rule registry ([2299669](https://github.com/geoql/doctor/commit/2299669527bd08ef71d64fe3754449f8722bbbde))
* **vue-doctor:** add --annotations + harden --threshold ([#30](https://github.com/geoql/doctor/issues/30)) ([7273910](https://github.com/geoql/doctor/commit/727391028cd577e1f9a644bd1b08d23baacbb1a0))
* **vue-doctor:** add --diff/--staged git scoping ([#27](https://github.com/geoql/doctor/issues/27)) ([d336fcb](https://github.com/geoql/doctor/commit/d336fcb1077dbddd68755f2b5ae92055723d1fc1))
* **vue-doctor:** add --full to force a complete scan ([#27](https://github.com/geoql/doctor/issues/27)) ([060dc25](https://github.com/geoql/doctor/commit/060dc25c7de5a4ebd53b6cc1f5d6e324a9ef3df8))
* **vue-doctor:** add --no-lint to skip the lint passes ([#26](https://github.com/geoql/doctor/issues/26)) ([3857d46](https://github.com/geoql/doctor/commit/3857d46f3f76b7e6b2da1ec6eb997d8307ccfe6a))
* **vue-doctor:** add --score flag for score-only output ([#31](https://github.com/geoql/doctor/issues/31)) ([071c997](https://github.com/geoql/doctor/commit/071c9974c59af83a6fef4507249579b09cb38f51))
* **vue-doctor:** add core/preset/output CLI flags ([#25](https://github.com/geoql/doctor/issues/25), [#26](https://github.com/geoql/doctor/issues/26), [#29](https://github.com/geoql/doctor/issues/29)) ([9010207](https://github.com/geoql/doctor/commit/9010207aeb329ce66ea2fee5054a582562f63246))
* **vue-doctor:** inspect subcommand for project capability introspection ([15ac185](https://github.com/geoql/doctor/commit/15ac18586b85789804374164d124493fc6d558c5))


### Bug Fixes

* **vue-doctor:** read CLI version from package.json + pin npm publish environment ([6d5f714](https://github.com/geoql/doctor/commit/6d5f7148c4d39ca88d61ab91e74e8fb09bebe327))
* **vue-doctor:** remove no-op --preset flag ([#25](https://github.com/geoql/doctor/issues/25)) ([39528ab](https://github.com/geoql/doctor/commit/39528ab209098112154a4882e6b54f270c84504a))


### Miscellaneous

* **release:** v0.1.0-alpha.0 ([62fd9bb](https://github.com/geoql/doctor/commit/62fd9bbde387dafb1f8056f4fc00597c8e1031d6))


### Code Refactoring

* **doctor-core:** 3-level severity + SPEC §7 √-decay score ([#19](https://github.com/geoql/doctor/issues/19)) ([641a6c0](https://github.com/geoql/doctor/commit/641a6c045bbf3880bf45d0eba27908df3ea01139))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-core bumped to 0.2.0-alpha.0
    * @geoql/oxlint-plugin-vue-doctor bumped to 0.1.1-alpha.0
