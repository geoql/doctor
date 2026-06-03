import type { ProjectInfo } from '../types/project-info.js';
import type { ResolvedDoctorConfig } from '../config/types.js';

export interface KnipConfig {
  cwd: string;
  entry: string[];
  project: string[];
  ignoreFiles: string[];
  ignoreDependencies: string[];
  compilers?: Record<string, true>;
}

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
  };

  if (isNuxt) {
    config.compilers = { nuxt: true };
  }

  return config;
}
