import { describe, expect, it } from 'vitest';
import { buildKnipConfig } from '../../src/dead-code/build-knip-config.js';
import type { ProjectInfo } from '../../src/types/project-info.js';
import type { ResolvedDoctorConfig } from '../../src/config/types.js';

const vueProjectInfo: ProjectInfo = {
  framework: 'vue',
  rootDirectory: '/project/vue-app',
  packageJsonPath: '/project/vue-app/package.json',
  vueVersion: '3.5.0',
  nuxtVersion: null,
  typescriptVersion: '6.0.0',
  hasAutoImports: false,
  hasComponentsAutoImport: false,
  hasPinia: false,
  hasVueRouter: false,
  nitroPreset: null,
  nuxtCompatibilityVersion: null,
  monorepoKind: null,
  capabilities: new Set(['vue:3', 'vue:3.5', 'typescript']),
};

const nuxtProjectInfo: ProjectInfo = {
  ...vueProjectInfo,
  framework: 'nuxt',
  rootDirectory: '/project/nuxt-app',
  nuxtVersion: '4.4.0',
  nuxtCompatibilityVersion: 4,
  hasAutoImports: true,
  hasComponentsAutoImport: true,
  capabilities: new Set([
    'vue:3',
    'vue:3.5',
    'nuxt:4',
    'nuxt:4.4',
    'auto-imports:vue',
    'components:auto',
    'typescript',
  ]),
};

const baseConfig: ResolvedDoctorConfig = {
  rootDir: '/project',
  include: [],
  exclude: ['**/fixtures/**', '**/__tests__/**'],
  failOn: 'error',
  threshold: 0,
  rules: {},
  source: 'built-in',
};

describe('buildKnipConfig', () => {
  it('produces vue entry points for vue framework', () => {
    const config = buildKnipConfig(vueProjectInfo, baseConfig);
    expect(config.entry).toEqual([
      'src/main.{ts,js}',
      'src/App.vue',
      'index.html',
      'vite.config.{ts,js}',
    ]);
    expect(config.compilers).toBeUndefined();
  });

  it('produces nuxt entry points and compilers for nuxt framework', () => {
    const config = buildKnipConfig(nuxtProjectInfo, baseConfig);
    expect(config.entry).toEqual([
      'app/**/*.vue',
      'app/**/*.ts',
      'server/**/*.ts',
      'nuxt.config.{ts,js,mjs}',
    ]);
    expect(config.compilers).toEqual({ nuxt: true });
  });

  it('sets cwd to projectInfo.rootDirectory', () => {
    const config = buildKnipConfig(vueProjectInfo, baseConfig);
    expect(config.cwd).toBe('/project/vue-app');
  });

  it('sets project glob with exclusions', () => {
    const config = buildKnipConfig(vueProjectInfo, baseConfig);
    expect(config.project).toEqual([
      '**/*.{ts,vue}',
      '!**/node_modules/**',
      '!**/dist/**',
      '!**/.nuxt/**',
      '!**/knip.config.mjs',
    ]);
  });

  it('forwards doctorConfig.exclude to ignoreFiles with knip.config.mjs', () => {
    const config = buildKnipConfig(vueProjectInfo, baseConfig);
    expect(config.ignoreFiles).toEqual([
      ...baseConfig.exclude,
      'knip.config.mjs',
    ]);
  });

  it('includes doctor-core plugin packages in ignoreDependencies', () => {
    const config = buildKnipConfig(vueProjectInfo, baseConfig);
    expect(config.ignoreDependencies).toEqual([
      'vite-plus',
      '@geoql/vue-doctor',
      '@geoql/nuxt-doctor',
    ]);
  });

  it('treats convention dirs as entry points for a Vue project with auto-imports', () => {
    const autoImportVue: ProjectInfo = {
      ...vueProjectInfo,
      hasAutoImports: true,
      hasComponentsAutoImport: true,
      hasVueRouter: true,
      capabilities: new Set([
        'vue:3',
        'vue:3.5',
        'auto-imports:vue',
        'components:auto',
        'vue-router',
        'typescript',
      ]),
    };
    const config = buildKnipConfig(autoImportVue, baseConfig);
    expect(config.entry).toContain('src/pages/**/*.vue');
    expect(config.entry).toContain('src/layouts/**/*.vue');
    expect(config.entry).toContain('src/components/**/*.vue');
    expect(config.entry).toContain('src/composables/**/*.ts');
    expect(config.entry).toContain('src/stores/**/*.ts');
    expect(config.entry).toContain('src/main.{ts,js}');
  });

  it('does NOT add convention entries for a plain Vue project without auto-imports', () => {
    const config = buildKnipConfig(vueProjectInfo, baseConfig);
    expect(config.entry).not.toContain('src/components/**/*.vue');
    expect(config.entry).not.toContain('src/composables/**/*.ts');
  });

  it('handles unknown framework as vue (fallback)', () => {
    const unknownProject: ProjectInfo = {
      ...vueProjectInfo,
      framework: 'unknown',
    };
    const config = buildKnipConfig(unknownProject, baseConfig);
    expect(config.entry).toEqual([
      'src/main.{ts,js}',
      'src/App.vue',
      'index.html',
      'vite.config.{ts,js}',
    ]);
    expect(config.compilers).toBeUndefined();
  });
});
