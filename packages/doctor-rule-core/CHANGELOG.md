# Changelog

## [1.2.2](https://github.com/geoql/doctor/compare/doctor-rule-core-v1.2.1...doctor-rule-core-v1.2.2) (2026-07-06)


### Bug Fixes

* **deps:** bump oxc-parser from 0.137.0 to 0.138.0 ([#120](https://github.com/geoql/doctor/issues/120)) ([f65c6f2](https://github.com/geoql/doctor/commit/f65c6f2176401736b36fe3b0eefc6c74b716c0fa))

## [1.2.1](https://github.com/geoql/doctor/compare/doctor-rule-core-v1.2.0...doctor-rule-core-v1.2.1) (2026-06-28)


### Bug Fixes

* false-positive rules + oxlint exclude support ([614d39d](https://github.com/geoql/doctor/commit/614d39d160f3527828f91fac997617bdb44647a9))
* **rule:** no-destructure-props-without-to-refs skips reactive nested scopes ([65a838a](https://github.com/geoql/doctor/commit/65a838af4345f4aaa0f15f525bcce2d1147f795d))
* **rule:** no-document-in-setup ignores type-level keys and import.meta.client guards ([81034dc](https://github.com/geoql/doctor/commit/81034dcc419d338d7435a9de1a1448e5c4d674c0))

## [1.2.0](https://github.com/geoql/doctor/compare/doctor-rule-core-v1.1.0...doctor-rule-core-v1.2.0) (2026-06-23)


### Features

* **core:** react.doctor parity — perf rules, dimension filters, sub-score ([a184d70](https://github.com/geoql/doctor/commit/a184d70d8e5edf4a6d5e1975cf5cfce394740140))

## [1.1.0](https://github.com/geoql/doctor/compare/doctor-rule-core-v1.0.0...doctor-rule-core-v1.1.0) (2026-06-20)


### Features

* **monorepo:** add security and design rule families ([eab410e](https://github.com/geoql/doctor/commit/eab410ea90ca9839de5f7648a499134409299160))


### Miscellaneous

* **deps:** bump dependencies, migrate lucide-vue-next to @lucide/vue ([f1e8f4a](https://github.com/geoql/doctor/commit/f1e8f4aa7e684ef7d8104150deee794f4ad3a204))


### Code Refactoring

* **monorepo:** extract shared rule cores into @geoql/doctor-rule-core ([12e4540](https://github.com/geoql/doctor/commit/12e4540d95aae6510b3e6e6b987cdd2366dc4d57))
* **monorepo:** migrate authored .mjs scripts to .ts and pin engines to node &gt;=24 ([ae3ec8d](https://github.com/geoql/doctor/commit/ae3ec8d9a10c8773c2d98478309b205a92b1c9ae))
