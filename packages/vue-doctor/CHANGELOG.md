# Changelog

## [2.0.0](https://github.com/geoql/doctor/compare/vue-doctor-v1.4.0...vue-doctor-v2.0.0) (2026-07-05)


### ⚠ BREAKING CHANGES

* **doctor-core:** harden config loader per SPEC §8 ([#23](https://github.com/geoql/doctor/issues/23))
* **doctor-core:** 3-level severity + SPEC §7 √-decay score ([#19](https://github.com/geoql/doctor/issues/19))

### Features

* **cli:** --fix auto-fixer framework + oxlint passthrough ([#61](https://github.com/geoql/doctor/issues/61)) ([fec5828](https://github.com/geoql/doctor/commit/fec582869e1d60fdee97f86080ddaa68f308350a))
* **cli:** --project workspace filter for vue-doctor + nuxt-doctor ([#27](https://github.com/geoql/doctor/issues/27)) ([ca3d2fb](https://github.com/geoql/doctor/commit/ca3d2fbc3914104aeaecd118b59da5b2a8edd667))
* **cli:** init subcommand ([#37](https://github.com/geoql/doctor/issues/37)) + --pr-comment reporter ([#58](https://github.com/geoql/doctor/issues/58)) ([662636e](https://github.com/geoql/doctor/commit/662636eaac579bce326c61e7d4be720febec1329))
* **core:** --fail-on=none + strict CLI validation (no silent fallback) ([8a8430c](https://github.com/geoql/doctor/commit/8a8430ceb831a26c720e535013952173a63fcd89))
* **core:** --format html reporter (self-contained, no external assets) ([dcd0f9f](https://github.com/geoql/doctor/commit/dcd0f9f88380e2affb4d52d02312b57c4fa683b3))
* **core:** react.doctor parity — perf rules, dimension filters, sub-score ([a184d70](https://github.com/geoql/doctor/commit/a184d70d8e5edf4a6d5e1975cf5cfce394740140))
* **core:** real --preset infra (minimal/recommended/strict/all) ([28bb1f5](https://github.com/geoql/doctor/commit/28bb1f53555b90413a89b8711ac2cb3c2643311b))
* **core:** rule-docs scaffold + explain subcommand + SARIF fullDescription ([16332bd](https://github.com/geoql/doctor/commit/16332bd256701dcb8ceec1d38a37f0e87e6aecea))
* **core:** zod v4 config schema as single source of truth ([0cb3de1](https://github.com/geoql/doctor/commit/0cb3de11779e87ac2f542e0d66aeb6ba7565a4b2))
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
* react-doctor parity — frameworkDetected, ci install, --max-duration ([545bbb8](https://github.com/geoql/doctor/commit/545bbb8fc2d608e3be182dfad729edd34928f6e3))
* **rules:** add 3 ai-slop reactivity rules + fix bundled plugin resolution ([5e52e6a](https://github.com/geoql/doctor/commit/5e52e6acaa21e496dc81188716c6f137ee2b8f23))
* **vue-cli,nuxt-cli:** add install command scaffolding the doctor agent skill ([9739ac6](https://github.com/geoql/doctor/commit/9739ac6a183d42c3dc8832302c4589034eac834f))
* **vue-cli,nuxt-cli:** add why/rules aliases for react.doctor parity ([0040477](https://github.com/geoql/doctor/commit/00404775bec79f4aa6d1d4d50699fbcd79bfe82c))
* **vue-cli:** add `vue-doctor ci install` subcommand ([2d6c1c6](https://github.com/geoql/doctor/commit/2d6c1c6f5f1714d52749c3ec6db38648289bec3b))
* **vue-cli:** thread --max-duration &lt;seconds&gt; through vue-doctor audit ([950a5e8](https://github.com/geoql/doctor/commit/950a5e86cf01fe8ae8603e02ed536dc0703a6f2a))
* **vue-doctor:** --ci / --no-ci flag with CI environment auto-detect ([80434bc](https://github.com/geoql/doctor/commit/80434bc42400b51e21056e3727eecaf206379844))
* **vue-doctor:** [#38](https://github.com/geoql/doctor/issues/38) list-rules subcommand + rule registry ([2299669](https://github.com/geoql/doctor/commit/2299669527bd08ef71d64fe3754449f8722bbbde))
* **vue-doctor:** add --annotations + harden --threshold ([#30](https://github.com/geoql/doctor/issues/30)) ([7273910](https://github.com/geoql/doctor/commit/727391028cd577e1f9a644bd1b08d23baacbb1a0))
* **vue-doctor:** add --diff/--staged git scoping ([#27](https://github.com/geoql/doctor/issues/27)) ([d336fcb](https://github.com/geoql/doctor/commit/d336fcb1077dbddd68755f2b5ae92055723d1fc1))
* **vue-doctor:** add --full to force a complete scan ([#27](https://github.com/geoql/doctor/issues/27)) ([060dc25](https://github.com/geoql/doctor/commit/060dc25c7de5a4ebd53b6cc1f5d6e324a9ef3df8))
* **vue-doctor:** add --no-lint to skip the lint passes ([#26](https://github.com/geoql/doctor/issues/26)) ([3857d46](https://github.com/geoql/doctor/commit/3857d46f3f76b7e6b2da1ec6eb997d8307ccfe6a))
* **vue-doctor:** add --score flag for score-only output ([#31](https://github.com/geoql/doctor/issues/31)) ([071c997](https://github.com/geoql/doctor/commit/071c9974c59af83a6fef4507249579b09cb38f51))
* **vue-doctor:** add core/preset/output CLI flags ([#25](https://github.com/geoql/doctor/issues/25), [#26](https://github.com/geoql/doctor/issues/26), [#29](https://github.com/geoql/doctor/issues/29)) ([9010207](https://github.com/geoql/doctor/commit/9010207aeb329ce66ea2fee5054a582562f63246))
* **vue-doctor:** inspect subcommand for project capability introspection ([15ac185](https://github.com/geoql/doctor/commit/15ac18586b85789804374164d124493fc6d558c5))
* **vue-doctor:** wire --push flag to push privacy-stripped findings to the SaaS ([29d8005](https://github.com/geoql/doctor/commit/29d80052ff9bf3f6c58db0d5e01f629bdab8edad))
* **vue:** wire oxlint 1.63 built-in vue/* rules into the audit ([#34](https://github.com/geoql/doctor/issues/34)) ([75a82a9](https://github.com/geoql/doctor/commit/75a82a974131a7b2f6cef9591d7bbd50fca32498))


### Bug Fixes

* **core:** [#91](https://github.com/geoql/doctor/issues/91) score/findings desync after allowedRuleIds filter ([2606aff](https://github.com/geoql/doctor/commit/2606aff02b7792372390e2d36bdb02910583947f))
* **core:** relativize pushed finding paths + point docs urls at docs.the-doctor.report ([542af7f](https://github.com/geoql/doctor/commit/542af7f4ac6bbf82b1da7303d2d9a71ef5a386e4))
* **jsr:** add doctor-core's static deps as CLI devDeps for byonm resolution ([1961569](https://github.com/geoql/doctor/commit/196156951b0b7f5f59446fe2a61e66c62dc80d2e))
* **jsr:** map @geoql/doctor-core to jsr specifier in CLI packages ([8d3f1d7](https://github.com/geoql/doctor/commit/8d3f1d767f0b4a6e5e8a977e110b43fec5157ee6))
* **monorepo:** add zod to CLI byonm devDeps for JSR publish ([a87913a](https://github.com/geoql/doctor/commit/a87913a85041d40258fb8bc627274ce6aa9fa810))
* **monorepo:** bump JSR import-map pin to doctor-core@^1.0.0 ([a9c86ba](https://github.com/geoql/doctor/commit/a9c86ba1feea1e6ce55204c74373170c501e1403))
* **vue-cli,nuxt-cli:** add --push-project flag for SaaS slug ([b744bde](https://github.com/geoql/doctor/commit/b744bdee1553dc59dc3be0562407f44788eae99b))
* **vue-doctor:** read CLI version from package.json + pin npm publish environment ([6d5f714](https://github.com/geoql/doctor/commit/6d5f7148c4d39ca88d61ab91e74e8fb09bebe327))
* **vue-doctor:** remove no-op --preset flag ([#25](https://github.com/geoql/doctor/issues/25)) ([39528ab](https://github.com/geoql/doctor/commit/39528ab209098112154a4882e6b54f270c84504a))


### Documentation

* consolidate to single SPEC.md, remove stale ARCHITECTURE.md ([727f4cd](https://github.com/geoql/doctor/commit/727f4cd89de364fc004dc78495c70b613e8ec3f3))
* rewrite all 5 package READMEs to match shipped v0.1.0 surface ([dd56904](https://github.com/geoql/doctor/commit/dd569046aea56ba794a4e0d44bca864c51983e96))


### Miscellaneous

* **deps:** bump dependencies, migrate lucide-vue-next to @lucide/vue ([f1e8f4a](https://github.com/geoql/doctor/commit/f1e8f4aa7e684ef7d8104150deee794f4ad3a204))
* **monorepo:** bump oxlint/knip/eslint/vite + raise audit-test timeouts for oxlint 1.72 ([b65f7bf](https://github.com/geoql/doctor/commit/b65f7bfeff602f7881707191d0b5b01866b6e3da))
* **monorepo:** bump vite 8.1, oxlint/oxfmt 1.71/0.56, knip 6.20, wrangler 4.105 ([828dbe6](https://github.com/geoql/doctor/commit/828dbe6b7c6e5287b7d2231b32169d59e0cdcebb))
* release main ([2439c80](https://github.com/geoql/doctor/commit/2439c80b69fded62b2fcf5a4874725670e57754f))
* release main ([177cc56](https://github.com/geoql/doctor/commit/177cc569ec02c892001b87c43799b5d1d5ea8ef2))
* release main ([93cc20d](https://github.com/geoql/doctor/commit/93cc20de9daf15ffbbc3dffc23b5aa062667574c))
* release main ([dd447da](https://github.com/geoql/doctor/commit/dd447dace262844fdbeea3f5d87ef6361a0b2461))
* release main ([60f3659](https://github.com/geoql/doctor/commit/60f3659da1f6e017f37257db6c551e5928fb2262))
* release main ([712e294](https://github.com/geoql/doctor/commit/712e29474fc9755c4be61e41548b2cf07277e4ef))
* release main ([ce1a7e1](https://github.com/geoql/doctor/commit/ce1a7e1d9ef385d62f0dcdad81fcc04e27076969))
* release main ([b11fb18](https://github.com/geoql/doctor/commit/b11fb1827716b8bf3dcabce6fd2164bfc99a5e62))
* release main ([ad2a15f](https://github.com/geoql/doctor/commit/ad2a15f59c1214601a338a72dfb9dab46a616aec))
* release main ([345ce32](https://github.com/geoql/doctor/commit/345ce325b3040adede70c63bc471feec6b3f429b))
* release main ([#105](https://github.com/geoql/doctor/issues/105)) ([3e840c9](https://github.com/geoql/doctor/commit/3e840c91e91587f0381f29e6da9244cb6fcf4afe))
* release main ([#79](https://github.com/geoql/doctor/issues/79)) ([df762b3](https://github.com/geoql/doctor/commit/df762b3c5cffaa52514c567d4c54dd6d9fd9bb47))
* release main ([#81](https://github.com/geoql/doctor/issues/81)) ([eb85d4b](https://github.com/geoql/doctor/commit/eb85d4bfb82f43e7462073e0983f1612cf862f4f))
* release main ([#82](https://github.com/geoql/doctor/issues/82)) ([d109569](https://github.com/geoql/doctor/commit/d109569ac77639dbe4a09bfcd7a65930f1e21be0))
* release main ([#87](https://github.com/geoql/doctor/issues/87)) ([f3dd0a1](https://github.com/geoql/doctor/commit/f3dd0a16aceeb639b3f899fda629718854285b6f))
* release main ([#90](https://github.com/geoql/doctor/issues/90)) ([8a6a754](https://github.com/geoql/doctor/commit/8a6a754433481f277b1ad5afb991fd9a013f5781))
* release main ([#94](https://github.com/geoql/doctor/issues/94)) ([180b92a](https://github.com/geoql/doctor/commit/180b92a8181d50b263e2d2e8116135c2aa157334))
* release main ([#96](https://github.com/geoql/doctor/issues/96)) ([20bec11](https://github.com/geoql/doctor/commit/20bec11e8bc6fa24a6872b9a2a70657ea58cdcbb))
* release main ([#97](https://github.com/geoql/doctor/issues/97)) ([b95cbbb](https://github.com/geoql/doctor/commit/b95cbbbf1e68af42fc873ee2890fc265d35cae42))
* release main ([#98](https://github.com/geoql/doctor/issues/98)) ([75a5cd7](https://github.com/geoql/doctor/commit/75a5cd7dbb9c870002d94fb823c830accb20ae22))
* **release:** v0.1.0-alpha.0 ([62fd9bb](https://github.com/geoql/doctor/commit/62fd9bbde387dafb1f8056f4fc00597c8e1031d6))
* **release:** v1.0.0 — first stable @geoql/doctor cut ([07bd2f4](https://github.com/geoql/doctor/commit/07bd2f4f05ecee082193d2084d47172e3e333499))


### Code Refactoring

* **doctor-core:** 3-level severity + SPEC §7 √-decay score ([#19](https://github.com/geoql/doctor/issues/19)) ([641a6c0](https://github.com/geoql/doctor/commit/641a6c045bbf3880bf45d0eba27908df3ea01139))
* **monorepo:** migrate authored .mjs scripts to .ts and pin engines to node &gt;=24 ([ae3ec8d](https://github.com/geoql/doctor/commit/ae3ec8d9a10c8773c2d98478309b205a92b1c9ae))

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
