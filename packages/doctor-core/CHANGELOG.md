# Changelog

## [1.7.0](https://github.com/geoql/doctor/compare/doctor-core-v1.6.0...doctor-core-v1.7.0) (2026-07-26)


### Features

* --push-workspace flag for monorepo score series ([50cac92](https://github.com/geoql/doctor/commit/50cac9299654a969f439b3877dd3913dcd92b99b))


### Miscellaneous

* **deps-dev:** bump knip from 6.26.0 to 6.27.0 ([#147](https://github.com/geoql/doctor/issues/147)) ([35a5241](https://github.com/geoql/doctor/commit/35a52418d130dcd3746e46f6a633bbc81b47fa77))

## [1.6.0](https://github.com/geoql/doctor/compare/doctor-core-v1.5.0...doctor-core-v1.6.0) (2026-07-15)


### Features

* **monorepo:** add --changed-files-from and --include-untracked git-scope flags ([d007899](https://github.com/geoql/doctor/commit/d0078996df4574ff046743a00bf250ca5a0236a3))
* **vue-plugin:** add security/markdown-it-unsanitized-html rule ([1a0a418](https://github.com/geoql/doctor/commit/1a0a418528037c2db5f07afafdea1fa10c1f3843))


### Bug Fixes

* **deps:** bump oxc-parser from 0.139.0 to 0.140.0 ([#143](https://github.com/geoql/doctor/issues/143)) ([0b91ca6](https://github.com/geoql/doctor/commit/0b91ca6fc8afaa15462b5e83a6bdc09c8d608772))
* **deps:** bump oxlint from 1.73.0 to 1.74.0 ([#144](https://github.com/geoql/doctor/issues/144)) ([5ac15f2](https://github.com/geoql/doctor/commit/5ac15f2fae678532d1d22ed083464a7371d6bf4e))


### Code Refactoring

* **core:** make Capability a strict union, not string ([dc697cd](https://github.com/geoql/doctor/commit/dc697cd77d3eb9743d84403a3b9dd7808d626c4f))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/oxlint-plugin-nuxt-doctor bumped to 1.2.1
    * @geoql/oxlint-plugin-vue-doctor bumped to 1.4.0

## [1.5.0](https://github.com/geoql/doctor/compare/doctor-core-v1.4.1...doctor-core-v1.5.0) (2026-07-12)


### Features

* **monorepo:** add 4 Vue/Nuxt rules + extend cleanup detection + fix --staged scope ([7b7219b](https://github.com/geoql/doctor/commit/7b7219b92eaafab88629280a53439856188355dd))


### Bug Fixes

* **deps:** bump oxc-parser from 0.138.0 to 0.139.0 ([#127](https://github.com/geoql/doctor/issues/127)) ([e665f80](https://github.com/geoql/doctor/commit/e665f8026fc0485d1c06bb0a6a6519aaab79a287))


### Miscellaneous

* **deps-dev:** bump vitest from 4.1.9 to 4.1.10 ([#128](https://github.com/geoql/doctor/issues/128)) ([f2762e0](https://github.com/geoql/doctor/commit/f2762e085e2fadf2e44655c9c41cceb1a370c8fa))
* **monorepo:** bump deps (oxlint 1.73, vite-plus 0.2.4, vitest coverage 4.1.10, pnpm 11.11) ([6e78255](https://github.com/geoql/doctor/commit/6e7825577a4afff70183fb6ef9d1a3b72836f879))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/oxlint-plugin-nuxt-doctor bumped to 1.2.0
    * @geoql/oxlint-plugin-vue-doctor bumped to 1.3.0

## [1.4.1](https://github.com/geoql/doctor/compare/doctor-core-v1.4.0...doctor-core-v1.4.1) (2026-07-06)


### Bug Fixes

* **deps:** bump oxc-parser from 0.137.0 to 0.138.0 ([#120](https://github.com/geoql/doctor/issues/120)) ([f65c6f2](https://github.com/geoql/doctor/commit/f65c6f2176401736b36fe3b0eefc6c74b716c0fa))


### Documentation

* drop stale hardcoded v0.1.0 from package READMEs ([a98738f](https://github.com/geoql/doctor/commit/a98738fe778c383aba3d3460f7800b5a4db4d5a8))


### Miscellaneous

* **deps-dev:** bump @types/node from 25.9.4 to 26.1.0 ([#110](https://github.com/geoql/doctor/issues/110)) ([a9a08e5](https://github.com/geoql/doctor/commit/a9a08e5f328ab8b9905892c56edb38d8e6a7f202))
* **deps-dev:** bump knip from 6.23.0 to 6.24.0 ([#116](https://github.com/geoql/doctor/issues/116)) ([d9422d2](https://github.com/geoql/doctor/commit/d9422d2db5e827c2b8653b1802f120caa4bdd2a3))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/oxlint-plugin-nuxt-doctor bumped to 1.1.3
    * @geoql/oxlint-plugin-vue-doctor bumped to 1.2.2

## [1.4.0](https://github.com/geoql/doctor/compare/doctor-core-v1.3.3...doctor-core-v1.4.0) (2026-07-05)


### Features

* **core:** add --max-duration deadline with additive incomplete + skippedCheckReasons ([ac5894c](https://github.com/geoql/doctor/commit/ac5894c42c1ad17eeca59f153dd3ac443a539f23))
* **core:** expose frameworkDetected on ProjectInfo + JSON reporter ([01a71ae](https://github.com/geoql/doctor/commit/01a71aeb983320d29de80e0086bbf8adde64113a))
* **core:** scaffold doctor-action@v2 workflows from doctor-core ([136c488](https://github.com/geoql/doctor/commit/136c48871d21c2d8572cbf3fc6b7ddb33a40d3f6))
* react-doctor parity — frameworkDetected, ci install, --max-duration ([545bbb8](https://github.com/geoql/doctor/commit/545bbb8fc2d608e3be182dfad729edd34928f6e3))

## [1.3.3](https://github.com/geoql/doctor/compare/doctor-core-v1.3.2...doctor-core-v1.3.3) (2026-07-01)


### Bug Fixes

* **core:** exclude NESTED node_modules/dist from default scan (bare glob leaked) ([eaf6c47](https://github.com/geoql/doctor/commit/eaf6c478acf8824eb18ad400022f66c83e543d62))


### Miscellaneous

* **monorepo:** bump oxlint/knip/eslint/vite + raise audit-test timeouts for oxlint 1.72 ([b65f7bf](https://github.com/geoql/doctor/commit/b65f7bfeff602f7881707191d0b5b01866b6e3da))

## [1.3.2](https://github.com/geoql/doctor/compare/doctor-core-v1.3.1...doctor-core-v1.3.2) (2026-06-29)


### Bug Fixes

* **seo:** recognize use*Seo* wrapper composables in page rules ([248bf15](https://github.com/geoql/doctor/commit/248bf156d689b24959cde50feb31411f6b1afee3))
* **seo:** recognize use*Seo* wrapper composables in SEO rules ([6ddc83c](https://github.com/geoql/doctor/commit/6ddc83c3a2a63df61b4d7cda63f9debd9d987abe))

## [1.3.1](https://github.com/geoql/doctor/compare/doctor-core-v1.3.0...doctor-core-v1.3.1) (2026-06-28)


### Bug Fixes

* **core:** oxlint script pass honors config.exclude via ignorePatterns ([684a6fe](https://github.com/geoql/doctor/commit/684a6fe7d67f4ca525cefadb23c607fb16fca7a3))
* **dead-code:** resolve pnpm catalog: protocol deps in unlisted-dependency ([841f464](https://github.com/geoql/doctor/commit/841f46426df97b991083d9cb25da3dd6d50a8f36))
* false-positive rules + oxlint exclude support ([614d39d](https://github.com/geoql/doctor/commit/614d39d160f3527828f91fac997617bdb44647a9))


### Miscellaneous

* **monorepo:** bump vite 8.1, oxlint/oxfmt 1.71/0.56, knip 6.20, wrangler 4.105 ([828dbe6](https://github.com/geoql/doctor/commit/828dbe6b7c6e5287b7d2231b32169d59e0cdcebb))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/oxlint-plugin-nuxt-doctor bumped to 1.1.2
    * @geoql/oxlint-plugin-vue-doctor bumped to 1.2.1

## [1.3.0](https://github.com/geoql/doctor/compare/doctor-core-v1.2.1...doctor-core-v1.3.0) (2026-06-23)


### Features

* **core:** react.doctor parity — perf rules, dimension filters, sub-score ([a184d70](https://github.com/geoql/doctor/commit/a184d70d8e5edf4a6d5e1975cf5cfce394740140))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/oxlint-plugin-nuxt-doctor bumped to 1.1.1
    * @geoql/oxlint-plugin-vue-doctor bumped to 1.2.0

## [1.2.1](https://github.com/geoql/doctor/compare/doctor-core-v1.2.0...doctor-core-v1.2.1) (2026-06-21)


### Bug Fixes

* **core:** republish to align oxc-parser ^0.137.0 for CLI JSR byonm ([60a58af](https://github.com/geoql/doctor/commit/60a58af01b45dadb41842476db146db96ecc6c62))

## [1.2.0](https://github.com/geoql/doctor/compare/doctor-core-v1.1.1...doctor-core-v1.2.0) (2026-06-20)


### Features

* **core,docs:** per-rule prompt endpoints + agent playbook ([408c4dd](https://github.com/geoql/doctor/commit/408c4dd90252476cddc1c2478ade82ba4584069a))
* **core:** zod v4 config schema as single source of truth ([0cb3de1](https://github.com/geoql/doctor/commit/0cb3de11779e87ac2f542e0d66aeb6ba7565a4b2))
* **monorepo:** add security and design rule families ([eab410e](https://github.com/geoql/doctor/commit/eab410ea90ca9839de5f7648a499134409299160))


### Miscellaneous

* **deps:** bump dependencies, migrate lucide-vue-next to @lucide/vue ([f1e8f4a](https://github.com/geoql/doctor/commit/f1e8f4aa7e684ef7d8104150deee794f4ad3a204))


### Code Refactoring

* **monorepo:** migrate authored .mjs scripts to .ts and pin engines to node &gt;=24 ([ae3ec8d](https://github.com/geoql/doctor/commit/ae3ec8d9a10c8773c2d98478309b205a92b1c9ae))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/oxlint-plugin-nuxt-doctor bumped to 1.1.0
    * @geoql/oxlint-plugin-vue-doctor bumped to 1.1.0

## [1.1.1](https://github.com/geoql/doctor/compare/doctor-core-v1.1.0...doctor-core-v1.1.1) (2026-06-10)


### Bug Fixes

* **core:** [#91](https://github.com/geoql/doctor/issues/91) score/findings desync after allowedRuleIds filter ([2606aff](https://github.com/geoql/doctor/commit/2606aff02b7792372390e2d36bdb02910583947f))
* **core:** relativize pushed finding paths + point docs urls at docs.the-doctor.report ([542af7f](https://github.com/geoql/doctor/commit/542af7f4ac6bbf82b1da7303d2d9a71ef5a386e4))

## [1.1.0](https://github.com/geoql/doctor/compare/doctor-core-v1.0.1...doctor-core-v1.1.0) (2026-06-09)


### Features

* **doctor-core:** add --push mode with privacy-stripped findings ([e6dbbd6](https://github.com/geoql/doctor/commit/e6dbbd6b5e96f81638a8851880c5fdd94fa3ab98))

## [1.0.1](https://github.com/geoql/doctor/compare/doctor-core-v1.0.0...doctor-core-v1.0.1) (2026-06-05)


### Bug Fixes

* **doctor-core:** dead-code knip ignores demo workspaces (example/playground) ([75cf7b4](https://github.com/geoql/doctor/commit/75cf7b42ed0644aa32f2edcdeeb485b4e679609e))

## [1.0.0](https://github.com/geoql/doctor/compare/doctor-core-v0.1.1...doctor-core-v1.0.0) (2026-06-04)


### Features

* first stable release — audit engine, scoring, reporters, and the hybrid two-pass pipeline are now API-stable


### Bug Fixes

* **core:** inject knip entry config via args.config so auto-import/file-routed dirs are not flagged as dead code ([#85](https://github.com/geoql/doctor/issues/85))


## [0.1.1](https://github.com/geoql/doctor/compare/doctor-core-v0.1.0...doctor-core-v0.1.1) (2026-06-02)


### Documentation

* rewrite all 5 package READMEs to match shipped v0.1.0 surface ([dd56904](https://github.com/geoql/doctor/commit/dd569046aea56ba794a4e0d44bca864c51983e96))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/oxlint-plugin-nuxt-doctor bumped to 0.1.1
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
* **deps:** vue-doctor/deps/vue-major-current ([#33](https://github.com/geoql/doctor/issues/33) sub-batch F2) ([e2b7d4d](https://github.com/geoql/doctor/commit/e2b7d4d384311dbb1cc43cbbf95309047c45b4b8))
* **doctor-core:** --verbose/--quiet observability + per-pass timings ([#29](https://github.com/geoql/doctor/issues/29)) ([b723b16](https://github.com/geoql/doctor/commit/b723b16aa73c4bb18510eb9383954a9d7f0a35ec))
* **doctor-core:** [#33](https://github.com/geoql/doctor/issues/33) sub-batch C1+C3 template/v-memo + no-inline-object-prop ([868d29a](https://github.com/geoql/doctor/commit/868d29a8a122ebd2fbcd12c016bf529086891471))
* **doctor-core:** [#33](https://github.com/geoql/doctor/issues/33) sub-batch D template-perf 2 rules ([898fcd7](https://github.com/geoql/doctor/commit/898fcd77f47113524b674fe4f3c6e1a9b368729e))
* **doctor-core:** [#33](https://github.com/geoql/doctor/issues/33) sub-batch E build-quality 4 post-checks ([2cbd57c](https://github.com/geoql/doctor/commit/2cbd57c736a22ad4c5f0dc44b3b67d56a905e55b))
* **doctor-core:** [#33](https://github.com/geoql/doctor/issues/33) sub-batch F1 deps/duplicate-vue-versions ([b4710f9](https://github.com/geoql/doctor/commit/b4710f9f16b54e26246a15c8ce1a50702ee24d81))
* **doctor-core:** [#35](https://github.com/geoql/doctor/issues/35) SARIF v2.1.0 reporter for GitHub Code Scanning ([db3b9d1](https://github.com/geoql/doctor/commit/db3b9d1d750d7ca69ac0f54b487a50f2b690bc3c))
* **doctor-core:** [#57](https://github.com/geoql/doctor/issues/57) engine-side SARIF hardening for GitHub Code Scanning ([7057abe](https://github.com/geoql/doctor/commit/7057abef4e441755c3d5a51af0384b331ecb5a22))
* **doctor-core:** add knip dead-code analysis pass ([#18](https://github.com/geoql/doctor/issues/18)) ([391e0a5](https://github.com/geoql/doctor/commit/391e0a58a01433865e5a5063341cb5a7528b7ee8))
* **doctor-core:** add no-mixed-options-and-composition-api SFC rule ([#13](https://github.com/geoql/doctor/issues/13)) ([8c7c24c](https://github.com/geoql/doctor/commit/8c7c24cb9ca6cc5070325ebee9fe21fd58f1a65c))
* **doctor-core:** add project detection + capability tokens ([#16](https://github.com/geoql/doctor/issues/16)) ([93078ca](https://github.com/geoql/doctor/commit/93078caa74f8796ebb30c820c30ecf8eac0b977c))
* **doctor-core:** agent/pretty/json reporters per SPEC §6 ([#20](https://github.com/geoql/doctor/issues/20) [#21](https://github.com/geoql/doctor/issues/21) [#22](https://github.com/geoql/doctor/issues/22)) ([844f8ec](https://github.com/geoql/doctor/commit/844f8ecda4d049c5f0bc832bfa21e9952c8c55d1))
* **doctor-core:** harden config loader per SPEC §8 ([#23](https://github.com/geoql/doctor/issues/23)) ([b9fc3df](https://github.com/geoql/doctor/commit/b9fc3df0ce589c0dd28d77b5e48c54db63444102))
* **doctor-core:** harden oxlint subprocess runner ([#17](https://github.com/geoql/doctor/issues/17)) ([760d854](https://github.com/geoql/doctor/commit/760d854dc5fe319b0349e0372a86fe307b64e031))
* **doctor-core:** hybrid two-pass audit pipeline ([427cde4](https://github.com/geoql/doctor/commit/427cde4a7e16155ed8524224c8303bb220d1ccd2)), closes [#16](https://github.com/geoql/doctor/issues/16)
* **doctor-core:** inline-disable directives + --no-respect-inline-disables ([#28](https://github.com/geoql/doctor/issues/28)) ([e8fa4ed](https://github.com/geoql/doctor/commit/e8fa4ed9229efcff239428c010504765399ac2d1))
* **nuxt:** 11 doctor-core project rules + nuxt-plugin 100% coverage ([2986d0b](https://github.com/geoql/doctor/commit/2986d0be2110a240dd08c8011e3101d3b887828c))
* **nuxt:** 3 SFC-pass + 2 cross-file nuxt rules (doctor-core) ([2d2a1aa](https://github.com/geoql/doctor/commit/2d2a1aa212c16197fec73a172bfcb079a706af1c))
* **nuxt:** nuxt-4 detection + 10 oxlint-plugin script rules ([d61cb1f](https://github.com/geoql/doctor/commit/d61cb1f66bf7010373e06015e87ef18fa6805d7e))
* **oxlint-plugin-vue-doctor:** add composition/* rules ([#33](https://github.com/geoql/doctor/issues/33) sub-batch B) ([c37a1d9](https://github.com/geoql/doctor/commit/c37a1d9d8c4477a630e57d1c1effbdf0be5ef85c))
* **packages:** scaffold doctor-core, oxlint-plugin-vue-doctor, vue-doctor ([#68](https://github.com/geoql/doctor/issues/68)) ([884a436](https://github.com/geoql/doctor/commit/884a4363fa17b7d39b7027950bf4b9f40f79d711))
* **rules:** add 3 ai-slop reactivity rules + fix bundled plugin resolution ([5e52e6a](https://github.com/geoql/doctor/commit/5e52e6acaa21e496dc81188716c6f137ee2b8f23))
* **rules:** add no-imports-from-vue-when-auto-imported ([#14](https://github.com/geoql/doctor/issues/14)) ([02768bc](https://github.com/geoql/doctor/commit/02768bc087e46a38a2c983c4eb0f7ed0daf9e45e))
* **vue-doctor:** [#38](https://github.com/geoql/doctor/issues/38) list-rules subcommand + rule registry ([2299669](https://github.com/geoql/doctor/commit/2299669527bd08ef71d64fe3754449f8722bbbde))
* **vue-doctor:** add --annotations + harden --threshold ([#30](https://github.com/geoql/doctor/issues/30)) ([7273910](https://github.com/geoql/doctor/commit/727391028cd577e1f9a644bd1b08d23baacbb1a0))
* **vue-doctor:** add --diff/--staged git scoping ([#27](https://github.com/geoql/doctor/issues/27)) ([d336fcb](https://github.com/geoql/doctor/commit/d336fcb1077dbddd68755f2b5ae92055723d1fc1))
* **vue-doctor:** add --no-lint to skip the lint passes ([#26](https://github.com/geoql/doctor/issues/26)) ([3857d46](https://github.com/geoql/doctor/commit/3857d46f3f76b7e6b2da1ec6eb997d8307ccfe6a))
* **vue-doctor:** add core/preset/output CLI flags ([#25](https://github.com/geoql/doctor/issues/25), [#26](https://github.com/geoql/doctor/issues/26), [#29](https://github.com/geoql/doctor/issues/29)) ([9010207](https://github.com/geoql/doctor/commit/9010207aeb329ce66ea2fee5054a582562f63246))


### Bug Fixes

* **core:** wire nuxt rules + repair silently-broken oxlint script pass ([ec11f9c](https://github.com/geoql/doctor/commit/ec11f9c907b7bd46d192b5ae3d6b44b1c8f787f0))
* **doctor-core:** preserve slashed rule names in oxlint code parsing ([12a3e3a](https://github.com/geoql/doctor/commit/12a3e3ab520de740ffa103580531e60f4dbb8bce))
* **rules:** make watch-without-cleanup fire in real oxlint; add e2e guard ([49a2a66](https://github.com/geoql/doctor/commit/49a2a6676f133865409b98674bf667ad08329832))


### Miscellaneous

* release main ([#79](https://github.com/geoql/doctor/issues/79)) ([df762b3](https://github.com/geoql/doctor/commit/df762b3c5cffaa52514c567d4c54dd6d9fd9bb47))
* **release:** v0.1.0-alpha.0 ([62fd9bb](https://github.com/geoql/doctor/commit/62fd9bbde387dafb1f8056f4fc00597c8e1031d6))


### Code Refactoring

* **doctor-core:** 3-level severity + SPEC §7 √-decay score ([#19](https://github.com/geoql/doctor/issues/19)) ([641a6c0](https://github.com/geoql/doctor/commit/641a6c045bbf3880bf45d0eba27908df3ea01139))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/oxlint-plugin-nuxt-doctor bumped to 0.1.0
    * @geoql/oxlint-plugin-vue-doctor bumped to 0.1.0

## [0.2.0-alpha.0](https://github.com/geoql/doctor/compare/doctor-core-v0.1.0-alpha.0...doctor-core-v0.2.0-alpha.0) (2026-05-31)


### ⚠ BREAKING CHANGES

* **doctor-core:** harden config loader per SPEC §8 ([#23](https://github.com/geoql/doctor/issues/23))
* **doctor-core:** 3-level severity + SPEC §7 √-decay score ([#19](https://github.com/geoql/doctor/issues/19))

### Features

* **core:** --fail-on=none + strict CLI validation (no silent fallback) ([8a8430c](https://github.com/geoql/doctor/commit/8a8430ceb831a26c720e535013952173a63fcd89))
* **core:** --format html reporter (self-contained, no external assets) ([dcd0f9f](https://github.com/geoql/doctor/commit/dcd0f9f88380e2affb4d52d02312b57c4fa683b3))
* **core:** real --preset infra (minimal/recommended/strict/all) ([28bb1f5](https://github.com/geoql/doctor/commit/28bb1f53555b90413a89b8711ac2cb3c2643311b))
* **core:** rule-docs scaffold + explain subcommand + SARIF fullDescription ([16332bd](https://github.com/geoql/doctor/commit/16332bd256701dcb8ceec1d38a37f0e87e6aecea))
* **deps:** vue-doctor/deps/vue-major-current ([#33](https://github.com/geoql/doctor/issues/33) sub-batch F2) ([e2b7d4d](https://github.com/geoql/doctor/commit/e2b7d4d384311dbb1cc43cbbf95309047c45b4b8))
* **doctor-core:** --verbose/--quiet observability + per-pass timings ([#29](https://github.com/geoql/doctor/issues/29)) ([b723b16](https://github.com/geoql/doctor/commit/b723b16aa73c4bb18510eb9383954a9d7f0a35ec))
* **doctor-core:** [#33](https://github.com/geoql/doctor/issues/33) sub-batch C1+C3 template/v-memo + no-inline-object-prop ([868d29a](https://github.com/geoql/doctor/commit/868d29a8a122ebd2fbcd12c016bf529086891471))
* **doctor-core:** [#33](https://github.com/geoql/doctor/issues/33) sub-batch D template-perf 2 rules ([898fcd7](https://github.com/geoql/doctor/commit/898fcd77f47113524b674fe4f3c6e1a9b368729e))
* **doctor-core:** [#33](https://github.com/geoql/doctor/issues/33) sub-batch E build-quality 4 post-checks ([2cbd57c](https://github.com/geoql/doctor/commit/2cbd57c736a22ad4c5f0dc44b3b67d56a905e55b))
* **doctor-core:** [#33](https://github.com/geoql/doctor/issues/33) sub-batch F1 deps/duplicate-vue-versions ([b4710f9](https://github.com/geoql/doctor/commit/b4710f9f16b54e26246a15c8ce1a50702ee24d81))
* **doctor-core:** [#35](https://github.com/geoql/doctor/issues/35) SARIF v2.1.0 reporter for GitHub Code Scanning ([db3b9d1](https://github.com/geoql/doctor/commit/db3b9d1d750d7ca69ac0f54b487a50f2b690bc3c))
* **doctor-core:** [#57](https://github.com/geoql/doctor/issues/57) engine-side SARIF hardening for GitHub Code Scanning ([7057abe](https://github.com/geoql/doctor/commit/7057abef4e441755c3d5a51af0384b331ecb5a22))
* **doctor-core:** add knip dead-code analysis pass ([#18](https://github.com/geoql/doctor/issues/18)) ([391e0a5](https://github.com/geoql/doctor/commit/391e0a58a01433865e5a5063341cb5a7528b7ee8))
* **doctor-core:** add no-mixed-options-and-composition-api SFC rule ([#13](https://github.com/geoql/doctor/issues/13)) ([8c7c24c](https://github.com/geoql/doctor/commit/8c7c24cb9ca6cc5070325ebee9fe21fd58f1a65c))
* **doctor-core:** add project detection + capability tokens ([#16](https://github.com/geoql/doctor/issues/16)) ([93078ca](https://github.com/geoql/doctor/commit/93078caa74f8796ebb30c820c30ecf8eac0b977c))
* **doctor-core:** agent/pretty/json reporters per SPEC §6 ([#20](https://github.com/geoql/doctor/issues/20) [#21](https://github.com/geoql/doctor/issues/21) [#22](https://github.com/geoql/doctor/issues/22)) ([844f8ec](https://github.com/geoql/doctor/commit/844f8ecda4d049c5f0bc832bfa21e9952c8c55d1))
* **doctor-core:** harden config loader per SPEC §8 ([#23](https://github.com/geoql/doctor/issues/23)) ([b9fc3df](https://github.com/geoql/doctor/commit/b9fc3df0ce589c0dd28d77b5e48c54db63444102))
* **doctor-core:** harden oxlint subprocess runner ([#17](https://github.com/geoql/doctor/issues/17)) ([760d854](https://github.com/geoql/doctor/commit/760d854dc5fe319b0349e0372a86fe307b64e031))
* **doctor-core:** hybrid two-pass audit pipeline ([427cde4](https://github.com/geoql/doctor/commit/427cde4a7e16155ed8524224c8303bb220d1ccd2)), closes [#16](https://github.com/geoql/doctor/issues/16)
* **doctor-core:** inline-disable directives + --no-respect-inline-disables ([#28](https://github.com/geoql/doctor/issues/28)) ([e8fa4ed](https://github.com/geoql/doctor/commit/e8fa4ed9229efcff239428c010504765399ac2d1))
* **oxlint-plugin-vue-doctor:** add composition/* rules ([#33](https://github.com/geoql/doctor/issues/33) sub-batch B) ([c37a1d9](https://github.com/geoql/doctor/commit/c37a1d9d8c4477a630e57d1c1effbdf0be5ef85c))
* **packages:** scaffold doctor-core, oxlint-plugin-vue-doctor, vue-doctor ([#68](https://github.com/geoql/doctor/issues/68)) ([884a436](https://github.com/geoql/doctor/commit/884a4363fa17b7d39b7027950bf4b9f40f79d711))
* **rules:** add 3 ai-slop reactivity rules + fix bundled plugin resolution ([5e52e6a](https://github.com/geoql/doctor/commit/5e52e6acaa21e496dc81188716c6f137ee2b8f23))
* **rules:** add no-imports-from-vue-when-auto-imported ([#14](https://github.com/geoql/doctor/issues/14)) ([02768bc](https://github.com/geoql/doctor/commit/02768bc087e46a38a2c983c4eb0f7ed0daf9e45e))
* **vue-doctor:** [#38](https://github.com/geoql/doctor/issues/38) list-rules subcommand + rule registry ([2299669](https://github.com/geoql/doctor/commit/2299669527bd08ef71d64fe3754449f8722bbbde))
* **vue-doctor:** add --annotations + harden --threshold ([#30](https://github.com/geoql/doctor/issues/30)) ([7273910](https://github.com/geoql/doctor/commit/727391028cd577e1f9a644bd1b08d23baacbb1a0))
* **vue-doctor:** add --diff/--staged git scoping ([#27](https://github.com/geoql/doctor/issues/27)) ([d336fcb](https://github.com/geoql/doctor/commit/d336fcb1077dbddd68755f2b5ae92055723d1fc1))
* **vue-doctor:** add --no-lint to skip the lint passes ([#26](https://github.com/geoql/doctor/issues/26)) ([3857d46](https://github.com/geoql/doctor/commit/3857d46f3f76b7e6b2da1ec6eb997d8307ccfe6a))
* **vue-doctor:** add core/preset/output CLI flags ([#25](https://github.com/geoql/doctor/issues/25), [#26](https://github.com/geoql/doctor/issues/26), [#29](https://github.com/geoql/doctor/issues/29)) ([9010207](https://github.com/geoql/doctor/commit/9010207aeb329ce66ea2fee5054a582562f63246))


### Bug Fixes

* **doctor-core:** preserve slashed rule names in oxlint code parsing ([12a3e3a](https://github.com/geoql/doctor/commit/12a3e3ab520de740ffa103580531e60f4dbb8bce))
* **rules:** make watch-without-cleanup fire in real oxlint; add e2e guard ([49a2a66](https://github.com/geoql/doctor/commit/49a2a6676f133865409b98674bf667ad08329832))


### Miscellaneous

* **release:** v0.1.0-alpha.0 ([62fd9bb](https://github.com/geoql/doctor/commit/62fd9bbde387dafb1f8056f4fc00597c8e1031d6))


### Code Refactoring

* **doctor-core:** 3-level severity + SPEC §7 √-decay score ([#19](https://github.com/geoql/doctor/issues/19)) ([641a6c0](https://github.com/geoql/doctor/commit/641a6c045bbf3880bf45d0eba27908df3ea01139))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/oxlint-plugin-vue-doctor bumped to 0.1.1-alpha.0
