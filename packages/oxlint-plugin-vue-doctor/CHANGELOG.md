# Changelog

## [1.2.1](https://github.com/geoql/doctor/compare/oxlint-plugin-vue-doctor-v1.2.0...oxlint-plugin-vue-doctor-v1.2.1) (2026-06-28)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-rule-core bumped to 1.2.1

## [1.2.0](https://github.com/geoql/doctor/compare/oxlint-plugin-vue-doctor-v1.1.0...oxlint-plugin-vue-doctor-v1.2.0) (2026-06-23)


### Features

* **core:** react.doctor parity — perf rules, dimension filters, sub-score ([a184d70](https://github.com/geoql/doctor/commit/a184d70d8e5edf4a6d5e1975cf5cfce394740140))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-rule-core bumped to 1.2.0

## [1.1.0](https://github.com/geoql/doctor/compare/oxlint-plugin-vue-doctor-v1.0.0...oxlint-plugin-vue-doctor-v1.1.0) (2026-06-20)


### Features

* **monorepo:** add security and design rule families ([eab410e](https://github.com/geoql/doctor/commit/eab410ea90ca9839de5f7648a499134409299160))


### Bug Fixes

* **monorepo:** track all 9 publishable packages in the release pipeline ([4603db9](https://github.com/geoql/doctor/commit/4603db9dfc32bde2a16c6ce44bb6a6c25ac1733b))


### Miscellaneous

* **deps:** bump dependencies, migrate lucide-vue-next to @lucide/vue ([f1e8f4a](https://github.com/geoql/doctor/commit/f1e8f4aa7e684ef7d8104150deee794f4ad3a204))


### Code Refactoring

* **monorepo:** extract shared rule cores into @geoql/doctor-rule-core ([12e4540](https://github.com/geoql/doctor/commit/12e4540d95aae6510b3e6e6b987cdd2366dc4d57))
* **monorepo:** migrate authored .mjs scripts to .ts and pin engines to node &gt;=24 ([ae3ec8d](https://github.com/geoql/doctor/commit/ae3ec8d9a10c8773c2d98478309b205a92b1c9ae))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-rule-core bumped to 1.1.0

## [1.0.0](https://github.com/geoql/doctor/compare/oxlint-plugin-vue-doctor-v0.1.1...oxlint-plugin-vue-doctor-v1.0.0) (2026-06-04)


### Features

* first stable release — Vue 3 anti-pattern rule set is now API-stable


## [0.1.1](https://github.com/geoql/doctor/compare/oxlint-plugin-vue-doctor-v0.1.0...oxlint-plugin-vue-doctor-v0.1.1) (2026-06-02)


### Documentation

* rewrite all 5 package READMEs to match shipped v0.1.0 surface ([dd56904](https://github.com/geoql/doctor/commit/dd569046aea56ba794a4e0d44bca864c51983e96))

## 0.1.0 (2026-06-02)


### Features

* **oxlint-plugin-vue-doctor:** add composition/* rules ([#33](https://github.com/geoql/doctor/issues/33) sub-batch B) ([c37a1d9](https://github.com/geoql/doctor/commit/c37a1d9d8c4477a630e57d1c1effbdf0be5ef85c))
* **oxlint-plugin:** [#33](https://github.com/geoql/doctor/issues/33) C2 performance/prefer-defineAsyncComponent-on-route ([99e214b](https://github.com/geoql/doctor/commit/99e214b2cb8a0d9c2d41d07ae93ecb90c61cfe77))
* **packages:** scaffold doctor-core, oxlint-plugin-vue-doctor, vue-doctor ([#68](https://github.com/geoql/doctor/issues/68)) ([884a436](https://github.com/geoql/doctor/commit/884a4363fa17b7d39b7027950bf4b9f40f79d711))
* **rules:** add 3 ai-slop reactivity rules + fix bundled plugin resolution ([5e52e6a](https://github.com/geoql/doctor/commit/5e52e6acaa21e496dc81188716c6f137ee2b8f23))
* **rules:** add no-imports-from-vue-when-auto-imported ([#14](https://github.com/geoql/doctor/issues/14)) ([02768bc](https://github.com/geoql/doctor/commit/02768bc087e46a38a2c983c4eb0f7ed0daf9e45e))
* **rules:** add reactivity/* rule batch — [#33](https://github.com/geoql/doctor/issues/33) sub-batch A ([84c86c5](https://github.com/geoql/doctor/commit/84c86c52d1899f6ab35caa1520c45dfcc4708e31))


### Bug Fixes

* **rules:** make watch-without-cleanup fire in real oxlint; add e2e guard ([49a2a66](https://github.com/geoql/doctor/commit/49a2a6676f133865409b98674bf667ad08329832))


### Miscellaneous

* release main ([#79](https://github.com/geoql/doctor/issues/79)) ([df762b3](https://github.com/geoql/doctor/commit/df762b3c5cffaa52514c567d4c54dd6d9fd9bb47))
* **release:** v0.1.0-alpha.0 ([62fd9bb](https://github.com/geoql/doctor/commit/62fd9bbde387dafb1f8056f4fc00597c8e1031d6))


### Code Refactoring

* **oxlint-plugin-vue-doctor:** move VUE_AUTO_IMPORTED to shared/ ([936cbc4](https://github.com/geoql/doctor/commit/936cbc4fa05910dfc00ae7e7c827d802960ebf36))

## [0.1.1-alpha.0](https://github.com/geoql/doctor/compare/oxlint-plugin-vue-doctor-v0.1.0-alpha.0...oxlint-plugin-vue-doctor-v0.1.1-alpha.0) (2026-05-31)


### Features

* **oxlint-plugin-vue-doctor:** add composition/* rules ([#33](https://github.com/geoql/doctor/issues/33) sub-batch B) ([c37a1d9](https://github.com/geoql/doctor/commit/c37a1d9d8c4477a630e57d1c1effbdf0be5ef85c))
* **oxlint-plugin:** [#33](https://github.com/geoql/doctor/issues/33) C2 performance/prefer-defineAsyncComponent-on-route ([99e214b](https://github.com/geoql/doctor/commit/99e214b2cb8a0d9c2d41d07ae93ecb90c61cfe77))
* **packages:** scaffold doctor-core, oxlint-plugin-vue-doctor, vue-doctor ([#68](https://github.com/geoql/doctor/issues/68)) ([884a436](https://github.com/geoql/doctor/commit/884a4363fa17b7d39b7027950bf4b9f40f79d711))
* **rules:** add 3 ai-slop reactivity rules + fix bundled plugin resolution ([5e52e6a](https://github.com/geoql/doctor/commit/5e52e6acaa21e496dc81188716c6f137ee2b8f23))
* **rules:** add no-imports-from-vue-when-auto-imported ([#14](https://github.com/geoql/doctor/issues/14)) ([02768bc](https://github.com/geoql/doctor/commit/02768bc087e46a38a2c983c4eb0f7ed0daf9e45e))
* **rules:** add reactivity/* rule batch — [#33](https://github.com/geoql/doctor/issues/33) sub-batch A ([84c86c5](https://github.com/geoql/doctor/commit/84c86c52d1899f6ab35caa1520c45dfcc4708e31))


### Bug Fixes

* **rules:** make watch-without-cleanup fire in real oxlint; add e2e guard ([49a2a66](https://github.com/geoql/doctor/commit/49a2a6676f133865409b98674bf667ad08329832))


### Miscellaneous

* **release:** v0.1.0-alpha.0 ([62fd9bb](https://github.com/geoql/doctor/commit/62fd9bbde387dafb1f8056f4fc00597c8e1031d6))


### Code Refactoring

* **oxlint-plugin-vue-doctor:** move VUE_AUTO_IMPORTED to shared/ ([936cbc4](https://github.com/geoql/doctor/commit/936cbc4fa05910dfc00ae7e7c827d802960ebf36))
