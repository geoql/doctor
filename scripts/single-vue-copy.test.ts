import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vite-plus/test';

// apps/docs must run ONE copy of Vue. When the lockfile resolves a second
// copy (for example Nuxt's own `vue` dependency left on an older patch after
// an automated bump of the app's `vue`), Nuxt's SSR renderer and the app code
// use different runtime-core instances. `useNuxtApp()` then throws
// NUXT_E1001 on some requests and the Worker returns 500 per isolate.
const LOCKFILE = fileURLToPath(new URL('../pnpm-lock.yaml', import.meta.url));

const VUE_RUNTIME_PACKAGES = [
  'vue',
  '@vue/runtime-core',
  '@vue/runtime-dom',
  '@vue/server-renderer',
  '@vue/reactivity',
  '@vue/shared',
] as const;

function resolvedVersions(lockfile: string, name: string): string[] {
  const escaped = name.replace(/[/@.]/g, (c) => `\\${c}`);
  const pattern = new RegExp(
    `^ {2}'?${escaped}@(\\d+\\.\\d+\\.\\d+[^:('\\s]*)`,
    'gm',
  );
  return [...new Set([...lockfile.matchAll(pattern)].map((m) => m[1]))];
}

describe('workspace lockfile', () => {
  const lockfile = readFileSync(LOCKFILE, 'utf8');

  it.each(VUE_RUNTIME_PACKAGES)(
    'resolves %s to exactly one version',
    (name) => {
      expect(resolvedVersions(lockfile, name)).toHaveLength(1);
    },
  );
});
