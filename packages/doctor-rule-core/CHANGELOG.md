# Changelog

## [1.4.1](https://github.com/geoql/doctor/compare/doctor-rule-core-v1.4.0...doctor-rule-core-v1.4.1) (2026-08-25)


### Bug Fixes

* **deps:** bump oxc-parser from 0.140.0 to 0.142.0 ([#159](https://github.com/geoql/doctor/issues/159)) ([9390969](https://github.com/geoql/doctor/commit/93909691b898c0714d3e0fafb90017b1385d204d))
* **deps:** bump oxc-parser from 0.143.0 to 0.144.0 ([#207](https://github.com/geoql/doctor/issues/207)) ([21c7622](https://github.com/geoql/doctor/commit/21c7622e81b53475d41ea89e37584f596b3ca62c))
* **rule:** watch-without-cleanup accepts watch() cleanup forms (geoql/doctor[#179](https://github.com/geoql/doctor/issues/179)) ([73e1933](https://github.com/geoql/doctor/commit/73e1933af3d959e6545f17c32254a329d99b0da2))


### Miscellaneous

* **deps-dev:** bump @types/node from 26.1.1 to 26.1.2 ([#164](https://github.com/geoql/doctor/issues/164)) ([2051941](https://github.com/geoql/doctor/commit/205194172b5c06f49683cf4a326724cca62c5a4b))
* **deps-dev:** bump @types/node from 26.1.2 to 26.2.0 ([#197](https://github.com/geoql/doctor/issues/197)) ([20b5d9e](https://github.com/geoql/doctor/commit/20b5d9e73f715ea8c338e9c911de44c665dfe4d7))
* **deps:** bump dependencies ✨ ([fa825f0](https://github.com/geoql/doctor/commit/fa825f03c592c2a349cc90aa90a75a734e4304db))

## [1.4.0](https://github.com/geoql/doctor/compare/doctor-rule-core-v1.3.0...doctor-rule-core-v1.4.0) (2026-07-15)


### Features

* **vue-plugin:** add security/markdown-it-unsanitized-html rule ([1a0a418](https://github.com/geoql/doctor/commit/1a0a418528037c2db5f07afafdea1fa10c1f3843))


### Bug Fixes

* **deps:** bump oxc-parser from 0.139.0 to 0.140.0 ([#143](https://github.com/geoql/doctor/issues/143)) ([0b91ca6](https://github.com/geoql/doctor/commit/0b91ca6fc8afaa15462b5e83a6bdc09c8d608772))

## [1.3.0](https://github.com/geoql/doctor/compare/doctor-rule-core-v1.2.2...doctor-rule-core-v1.3.0) (2026-07-12)


### Features

* **monorepo:** add 4 Vue/Nuxt rules + extend cleanup detection + fix --staged scope ([7b7219b](https://github.com/geoql/doctor/commit/7b7219b92eaafab88629280a53439856188355dd))


### Bug Fixes

* **deps:** bump oxc-parser from 0.138.0 to 0.139.0 ([#127](https://github.com/geoql/doctor/issues/127)) ([e665f80](https://github.com/geoql/doctor/commit/e665f8026fc0485d1c06bb0a6a6519aaab79a287))


### Miscellaneous

* **deps-dev:** bump vitest from 4.1.9 to 4.1.10 ([#128](https://github.com/geoql/doctor/issues/128)) ([f2762e0](https://github.com/geoql/doctor/commit/f2762e085e2fadf2e44655c9c41cceb1a370c8fa))
* **monorepo:** bump deps (oxlint 1.73, vite-plus 0.2.4, vitest coverage 4.1.10, pnpm 11.11) ([6e78255](https://github.com/geoql/doctor/commit/6e7825577a4afff70183fb6ef9d1a3b72836f879))

## [1.2.2](https://github.com/geoql/doctor/compare/doctor-rule-core-v1.2.1...doctor-rule-core-v1.2.2) (2026-07-06)


### Bug Fixes

* **deps:** bump oxc-parser from 0.137.0 to 0.138.0 ([#120](https://github.com/geoql/doctor/issues/120)) ([f65c6f2](https://github.com/geoql/doctor/commit/f65c6f2176401736b36fe3b0eefc6c74b716c0fa))


### Miscellaneous

* **deps-dev:** bump @types/node from 25.9.4 to 26.1.0 ([#110](https://github.com/geoql/doctor/issues/110)) ([a9a08e5](https://github.com/geoql/doctor/commit/a9a08e5f328ab8b9905892c56edb38d8e6a7f202))

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
