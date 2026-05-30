# Changelog

## [0.2.0-alpha.0](https://github.com/geoql/doctor/compare/doctor-core-v0.1.0-alpha.0...doctor-core-v0.2.0-alpha.0) (2026-05-30)


### ⚠ BREAKING CHANGES

* **doctor-core:** harden config loader per SPEC §8 ([#23](https://github.com/geoql/doctor/issues/23))
* **doctor-core:** 3-level severity + SPEC §7 √-decay score ([#19](https://github.com/geoql/doctor/issues/19))

### Features

* **doctor-core:** add no-mixed-options-and-composition-api SFC rule ([#13](https://github.com/geoql/doctor/issues/13)) ([8c7c24c](https://github.com/geoql/doctor/commit/8c7c24cb9ca6cc5070325ebee9fe21fd58f1a65c))
* **doctor-core:** add project detection + capability tokens ([#16](https://github.com/geoql/doctor/issues/16)) ([93078ca](https://github.com/geoql/doctor/commit/93078caa74f8796ebb30c820c30ecf8eac0b977c))
* **doctor-core:** agent/pretty/json reporters per SPEC §6 ([#20](https://github.com/geoql/doctor/issues/20) [#21](https://github.com/geoql/doctor/issues/21) [#22](https://github.com/geoql/doctor/issues/22)) ([844f8ec](https://github.com/geoql/doctor/commit/844f8ecda4d049c5f0bc832bfa21e9952c8c55d1))
* **doctor-core:** harden config loader per SPEC §8 ([#23](https://github.com/geoql/doctor/issues/23)) ([b9fc3df](https://github.com/geoql/doctor/commit/b9fc3df0ce589c0dd28d77b5e48c54db63444102))
* **doctor-core:** harden oxlint subprocess runner ([#17](https://github.com/geoql/doctor/issues/17)) ([760d854](https://github.com/geoql/doctor/commit/760d854dc5fe319b0349e0372a86fe307b64e031))
* **doctor-core:** hybrid two-pass audit pipeline ([427cde4](https://github.com/geoql/doctor/commit/427cde4a7e16155ed8524224c8303bb220d1ccd2)), closes [#16](https://github.com/geoql/doctor/issues/16)
* **packages:** scaffold doctor-core, oxlint-plugin-vue-doctor, vue-doctor ([#68](https://github.com/geoql/doctor/issues/68)) ([884a436](https://github.com/geoql/doctor/commit/884a4363fa17b7d39b7027950bf4b9f40f79d711))
* **rules:** add 3 ai-slop reactivity rules + fix bundled plugin resolution ([5e52e6a](https://github.com/geoql/doctor/commit/5e52e6acaa21e496dc81188716c6f137ee2b8f23))
* **rules:** add no-imports-from-vue-when-auto-imported ([#14](https://github.com/geoql/doctor/issues/14)) ([02768bc](https://github.com/geoql/doctor/commit/02768bc087e46a38a2c983c4eb0f7ed0daf9e45e))


### Miscellaneous

* **release:** v0.1.0-alpha.0 ([62fd9bb](https://github.com/geoql/doctor/commit/62fd9bbde387dafb1f8056f4fc00597c8e1031d6))


### Code Refactoring

* **doctor-core:** 3-level severity + SPEC §7 √-decay score ([#19](https://github.com/geoql/doctor/issues/19)) ([641a6c0](https://github.com/geoql/doctor/commit/641a6c045bbf3880bf45d0eba27908df3ea01139))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/oxlint-plugin-vue-doctor bumped to 0.1.1-alpha.0
