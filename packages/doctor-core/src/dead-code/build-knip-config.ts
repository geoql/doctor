import type { ProjectInfo } from '../types/project-info.js';
import type { ResolvedDoctorConfig } from '../config/types.js';

export interface KnipConfig {
  cwd: string;
  entry: string[];
  project: string[];
  ignoreFiles: string[];
  ignoreDependencies: string[];
  ignoreWorkspaces: string[];
  compilers?: Record<string, true>;
}

// Demo/playground sub-workspaces are dev-only surface, not the published
// library. `example/` is the Vue-library demo convention; `playground/` is the
// Nuxt-module convention. knip auto-discovers them as workspaces and tries to
// load their vite.config.ts / nuxt.config.ts — which fails ("Cannot find module
// 'vite'") in a bare CI checkout with no node_modules, leaking to stderr.
// `ignoreWorkspaces` is the ONLY knip mechanism that skips a workspace BEFORE
// its config files are loaded (`ignore` globs filter results too late; a
// `workspaces` map only ADDS to auto-discovery, never replaces it).
const DEMO_WORKSPACES = ['example', 'playground'];

export function buildKnipConfig(
  projectInfo: ProjectInfo,
  doctorConfig: ResolvedDoctorConfig,
): KnipConfig {
  const isNuxt = projectInfo.framework === 'nuxt';

  // Files registered by build-time plugins (unplugin-auto-import,
  // unplugin-vue-components, file-based routing/layouts) have no explicit import,
  // so knip flags them as unused. Treat their convention dirs as entry points
  // when the project actually uses those plugins, otherwise the dead-code pass
  // reports hundreds of false positives (see issue #85).
  const usesConventionResolution =
    projectInfo.hasAutoImports ||
    projectInfo.hasComponentsAutoImport ||
    projectInfo.hasVueRouter;

  const entry = isNuxt
    ? [
        'app/**/*.vue',
        'app/**/*.ts',
        'server/**/*.ts',
        'nuxt.config.{ts,js,mjs}',
      ]
    : [
        'src/main.{ts,js}',
        'src/App.vue',
        'index.html',
        'vite.config.{ts,js}',
        ...(usesConventionResolution
          ? [
              'src/pages/**/*.vue',
              'src/layouts/**/*.vue',
              'src/components/**/*.vue',
              'src/composables/**/*.ts',
              'src/stores/**/*.ts',
            ]
          : []),
      ];

  const config: KnipConfig = {
    cwd: projectInfo.rootDirectory,
    entry,
    project: [
      '**/*.{ts,vue}',
      '!**/node_modules/**',
      '!**/dist/**',
      '!**/.nuxt/**',
      '!**/knip.config.mjs',
    ],
    ignoreFiles: [...doctorConfig.exclude, 'knip.config.mjs'],
    ignoreDependencies: [
      'vite-plus',
      '@geoql/vue-doctor',
      '@geoql/nuxt-doctor',
    ],
    ignoreWorkspaces: [...DEMO_WORKSPACES],
  };

  if (isNuxt) {
    config.compilers = { nuxt: true };
  }

  return config;
}
