# Changelog

## [1.2.0](https://github.com/geoql/doctor/compare/nuxt-doctor-v1.1.2...nuxt-doctor-v1.2.0) (2026-06-20)


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
    * @geoql/oxlint-plugin-nuxt-doctor bumped to 1.1.0
    * @geoql/oxlint-plugin-vue-doctor bumped to 1.1.0

## [1.1.2](https://github.com/geoql/doctor/compare/nuxt-doctor-v1.1.1...nuxt-doctor-v1.1.2) (2026-06-10)


### Bug Fixes

* **core:** [#91](https://github.com/geoql/doctor/issues/91) score/findings desync after allowedRuleIds filter ([2606aff](https://github.com/geoql/doctor/commit/2606aff02b7792372390e2d36bdb02910583947f))
* **core:** relativize pushed finding paths + point docs urls at docs.the-doctor.report ([542af7f](https://github.com/geoql/doctor/commit/542af7f4ac6bbf82b1da7303d2d9a71ef5a386e4))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-core bumped to 1.1.1

## [1.1.1](https://github.com/geoql/doctor/compare/nuxt-doctor-v1.1.0...nuxt-doctor-v1.1.1) (2026-06-09)


### Bug Fixes

* **monorepo:** bump JSR import-map pin to doctor-core@^1.0.0 ([a9c86ba](https://github.com/geoql/doctor/commit/a9c86ba1feea1e6ce55204c74373170c501e1403))
* **vue-cli,nuxt-cli:** add --push-project flag for SaaS slug ([b744bde](https://github.com/geoql/doctor/commit/b744bdee1553dc59dc3be0562407f44788eae99b))

## [1.1.0](https://github.com/geoql/doctor/compare/nuxt-doctor-v1.0.1...nuxt-doctor-v1.1.0) (2026-06-09)


### Features

* **nuxt-doctor:** wire --push flag to push privacy-stripped findings to the SaaS ([5a8da3e](https://github.com/geoql/doctor/commit/5a8da3e6bd42809e6fd813d453e7f368325167d9))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-core bumped to 1.1.0

## [1.0.1](https://github.com/geoql/doctor/compare/nuxt-doctor-v1.0.0...nuxt-doctor-v1.0.1) (2026-06-05)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-core bumped to 1.0.1

## [1.0.0](https://github.com/geoql/doctor/compare/nuxt-doctor-v0.1.1...nuxt-doctor-v1.0.0) (2026-06-04)


### Features

* first stable release — `npx @geoql/nuxt-doctor` CLI surface is now API-stable


## [0.1.1](https://github.com/geoql/doctor/compare/nuxt-doctor-v0.1.0...nuxt-doctor-v0.1.1) (2026-06-02)


### Bug Fixes

* **jsr:** add doctor-core's static deps as CLI devDeps for byonm resolution ([1961569](https://github.com/geoql/doctor/commit/196156951b0b7f5f59446fe2a61e66c62dc80d2e))
* **jsr:** map @geoql/doctor-core to jsr specifier in CLI packages ([8d3f1d7](https://github.com/geoql/doctor/commit/8d3f1d767f0b4a6e5e8a977e110b43fec5157ee6))


### Documentation

* rewrite all 5 package READMEs to match shipped v0.1.0 surface ([dd56904](https://github.com/geoql/doctor/commit/dd569046aea56ba794a4e0d44bca864c51983e96))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-core bumped to 0.1.1
    * @geoql/oxlint-plugin-nuxt-doctor bumped to 0.1.1
    * @geoql/oxlint-plugin-vue-doctor bumped to 0.1.1

## 0.1.0 (2026-06-02)


### Features

* **nuxt:** scaffold @geoql/oxlint-plugin-nuxt-doctor + @geoql/nuxt-doctor ([fb93395](https://github.com/geoql/doctor/commit/fb933950a1e9f70f490b03bfc6803f6ec84cc69b))


### Bug Fixes

* **core:** wire nuxt rules + repair silently-broken oxlint script pass ([ec11f9c](https://github.com/geoql/doctor/commit/ec11f9c907b7bd46d192b5ae3d6b44b1c8f787f0))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @geoql/doctor-core bumped to 0.1.0
    * @geoql/oxlint-plugin-nuxt-doctor bumped to 0.1.0
    * @geoql/oxlint-plugin-vue-doctor bumped to 0.1.0
