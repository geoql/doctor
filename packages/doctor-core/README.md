# `@geoql/doctor-core`

> Audit engine shared by [`@geoql/vue-doctor`](../vue-doctor) and (future) `@geoql/nuxt-doctor`.

Implements the **hybrid two-pass design** locked in [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md):

1. **Template pass** — parses `.vue` SFCs with `@vue/compiler-sfc` and walks the template AST for rules that need template-level context (e.g. `v-for` missing `:key`).
2. **Script pass** — spawns `oxlint` as a subprocess with a generated `.oxlintrc.json` that activates oxlint's built-in `vue` plugin AND a custom `jsPlugins` entry (`@geoql/oxlint-plugin-vue-doctor`).

Diagnostics from both passes are merged, deduped, and fed into a deterministic 0–100 score.

## Usage (programmatic)

```ts
import { audit } from '@geoql/doctor-core';

const report = await audit({
  rootDir: process.cwd(),
  include: ['**/*.vue', '**/*.ts'],
  failOn: 'error',
});

for (const diag of report.diagnostics) {
  console.log(
    `${diag.file}:${diag.line}:${diag.column} ${diag.severity} ${diag.ruleId}: ${diag.message}`,
  );
}
console.log(`Score: ${report.score}/100`);
```

Most users should depend on `@geoql/vue-doctor` (the CLI) rather than this package directly.

## License

MIT © Vinayak Kulkarni
