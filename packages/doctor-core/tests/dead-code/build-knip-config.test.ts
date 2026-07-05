import { chmod, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildKnipConfig } from '../../src/dead-code/build-knip-config.js';
import type { ProjectInfo } from '../../src/types/project-info.js';
import type { ResolvedDoctorConfig } from '../../src/config/types.js';

async function tmp(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'geoql-doctor-knip-'));
}

const vueProjectInfo: ProjectInfo = {
  framework: 'vue',
  frameworkDetected: true,
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
  frameworkDetected: true,
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
  it('produces vue entry points for vue framework', async () => {
    const config = await buildKnipConfig(vueProjectInfo, baseConfig);
    expect(config.entry).toEqual([
      'src/main.{ts,js}',
      'src/App.vue',
      'index.html',
      'vite.config.{ts,js}',
    ]);
    expect(config.compilers).toBeUndefined();
  });

  it('produces nuxt entry points and compilers for nuxt framework', async () => {
    const config = await buildKnipConfig(nuxtProjectInfo, baseConfig);
    expect(config.entry).toEqual([
      'app/**/*.vue',
      'app/**/*.ts',
      'server/**/*.ts',
      'nuxt.config.{ts,js,mjs}',
    ]);
    expect(config.compilers).toEqual({ nuxt: true });
  });

  it('sets cwd to projectInfo.rootDirectory', async () => {
    const config = await buildKnipConfig(vueProjectInfo, baseConfig);
    expect(config.cwd).toBe('/project/vue-app');
  });

  it('sets project glob with exclusions', async () => {
    const config = await buildKnipConfig(vueProjectInfo, baseConfig);
    expect(config.project).toEqual([
      '**/*.{ts,vue}',
      '!**/node_modules/**',
      '!**/dist/**',
      '!**/.nuxt/**',
      '!**/knip.config.mjs',
    ]);
  });

  it('forwards doctorConfig.exclude to ignoreFiles with knip.config.mjs', async () => {
    const config = await buildKnipConfig(vueProjectInfo, baseConfig);
    expect(config.ignoreFiles).toEqual([
      ...baseConfig.exclude,
      'knip.config.mjs',
    ]);
  });

  it('includes doctor-core plugin packages in ignoreDependencies', async () => {
    const config = await buildKnipConfig(vueProjectInfo, baseConfig);
    expect(config.ignoreDependencies).toEqual([
      'vite-plus',
      '@geoql/vue-doctor',
      '@geoql/nuxt-doctor',
    ]);
  });

  it('ignores the example demo workspace for a Vue library', async () => {
    const config = await buildKnipConfig(vueProjectInfo, baseConfig);
    expect(config.ignoreWorkspaces).toEqual(['example', 'playground']);
  });

  it('ignores the playground demo workspace for a Nuxt module', async () => {
    const config = await buildKnipConfig(nuxtProjectInfo, baseConfig);
    expect(config.ignoreWorkspaces).toEqual(['example', 'playground']);
  });

  it('treats convention dirs as entry points for a Vue project with auto-imports', async () => {
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
    const config = await buildKnipConfig(autoImportVue, baseConfig);
    expect(config.entry).toContain('src/pages/**/*.vue');
    expect(config.entry).toContain('src/layouts/**/*.vue');
    expect(config.entry).toContain('src/components/**/*.vue');
    expect(config.entry).toContain('src/composables/**/*.ts');
    expect(config.entry).toContain('src/stores/**/*.ts');
    expect(config.entry).toContain('src/main.{ts,js}');
  });

  it('does NOT add convention entries for a plain Vue project without auto-imports', async () => {
    const config = await buildKnipConfig(vueProjectInfo, baseConfig);
    expect(config.entry).not.toContain('src/components/**/*.vue');
    expect(config.entry).not.toContain('src/composables/**/*.ts');
  });

  it('handles unknown framework as vue (fallback)', async () => {
    const unknownProject: ProjectInfo = {
      ...vueProjectInfo,
      framework: 'unknown',
    };
    const config = await buildKnipConfig(unknownProject, baseConfig);
    expect(config.entry).toEqual([
      'src/main.{ts,js}',
      'src/App.vue',
      'index.html',
      'vite.config.{ts,js}',
    ]);
    expect(config.compilers).toBeUndefined();
  });

  it('resolves single catalog dep and adds to ignoreDependencies', async () => {
    const root = await tmp();
    const appDir = join(root, 'apps', 'web');
    await mkdir(appDir, { recursive: true });
    await writeFile(
      join(appDir, 'package.json'),
      JSON.stringify({
        name: 'web',
        dependencies: { '@geoql/v-maplibre': 'catalog:app:web' },
      }),
    );
    await writeFile(
      join(root, 'pnpm-workspace.yaml'),
      'catalogs:\n  app:web:\n    "@geoql/v-maplibre": ^1.2.0\n',
    );
    const projectInfo: ProjectInfo = {
      ...nuxtProjectInfo,
      rootDirectory: appDir,
    };
    const config = await buildKnipConfig(projectInfo, baseConfig);
    expect(config.ignoreDependencies).toContain('@geoql/v-maplibre');
  });

  it('resolves multiple catalogs', async () => {
    const root = await tmp();
    const appDir = join(root, 'apps', 'web');
    await mkdir(appDir, { recursive: true });
    await writeFile(
      join(appDir, 'package.json'),
      JSON.stringify({
        name: 'web',
        dependencies: {
          '@geoql/v-maplibre': 'catalog:app:web',
          wrangler: 'catalog:app:tiles-worker',
        },
      }),
    );
    await writeFile(
      join(root, 'pnpm-workspace.yaml'),
      [
        'catalogs:',
        '  app:web:',
        '    "@geoql/v-maplibre": ^1.2.0',
        '    vue: ^3.5.0',
        '  app:tiles-worker:',
        '    wrangler: ^4.0.0',
      ].join('\n') + '\n',
    );
    const projectInfo: ProjectInfo = {
      ...nuxtProjectInfo,
      rootDirectory: appDir,
    };
    const config = await buildKnipConfig(projectInfo, baseConfig);
    expect(config.ignoreDependencies).toContain('@geoql/v-maplibre');
    expect(config.ignoreDependencies).toContain('wrangler');
  });

  it('does not double-add existing ignoreDependencies', async () => {
    const root = await tmp();
    const appDir = join(root, 'apps', 'web');
    await mkdir(appDir, { recursive: true });
    await writeFile(
      join(appDir, 'package.json'),
      JSON.stringify({
        name: 'web',
        dependencies: { '@geoql/nuxt-doctor': 'catalog:app:web' },
      }),
    );
    await writeFile(
      join(root, 'pnpm-workspace.yaml'),
      'catalogs:\n  app:web:\n    "@geoql/nuxt-doctor": ^1.0.0\n',
    );
    const projectInfo: ProjectInfo = {
      ...nuxtProjectInfo,
      rootDirectory: appDir,
    };
    const config = await buildKnipConfig(projectInfo, baseConfig);
    expect(
      config.ignoreDependencies.filter((dep) => dep === '@geoql/nuxt-doctor')
        .length,
    ).toBe(1);
  });

  it('returns base config unchanged when no pnpm-workspace.yaml exists', async () => {
    const root = await tmp();
    const appDir = join(root, 'apps', 'web');
    await mkdir(appDir, { recursive: true });
    await writeFile(
      join(appDir, 'package.json'),
      JSON.stringify({
        name: 'web',
        dependencies: { '@geoql/v-maplibre': 'catalog:app:web' },
      }),
    );
    const projectInfo: ProjectInfo = {
      ...nuxtProjectInfo,
      rootDirectory: appDir,
    };
    const config = await buildKnipConfig(projectInfo, baseConfig);
    expect(config.ignoreDependencies).toEqual([
      'vite-plus',
      '@geoql/vue-doctor',
      '@geoql/nuxt-doctor',
    ]);
  });

  it('stops scanning at a top-level sibling key when the target catalog is absent', async () => {
    const root = await tmp();
    const appDir = join(root, 'apps', 'web');
    await mkdir(appDir, { recursive: true });
    await writeFile(
      join(appDir, 'package.json'),
      JSON.stringify({
        name: 'web',
        dependencies: { '@geoql/v-maplibre': 'catalog:app:web' },
      }),
    );
    await writeFile(
      join(root, 'pnpm-workspace.yaml'),
      [
        'catalogs:',
        '  app:other:',
        '    vue: ^3.5.0',
        'packages:',
        '  - "apps/*"',
      ].join('\n') + '\n',
    );
    const projectInfo: ProjectInfo = {
      ...nuxtProjectInfo,
      rootDirectory: appDir,
    };
    const config = await buildKnipConfig(projectInfo, baseConfig);
    expect(config.ignoreDependencies).not.toContain('@geoql/v-maplibre');
  });

  it('returns no catalog deps when package.json is unparseable', async () => {
    const root = await tmp();
    const appDir = join(root, 'apps', 'web');
    await mkdir(appDir, { recursive: true });
    await writeFile(join(appDir, 'package.json'), '{ not valid json');
    await writeFile(
      join(root, 'pnpm-workspace.yaml'),
      'catalogs:\n  app:web:\n    "@geoql/v-maplibre": ^1.2.0\n',
    );
    const projectInfo: ProjectInfo = {
      ...nuxtProjectInfo,
      rootDirectory: appDir,
    };
    const config = await buildKnipConfig(projectInfo, baseConfig);
    expect(config.ignoreDependencies).not.toContain('@geoql/v-maplibre');
  });

  it('returns no catalog deps when pnpm-workspace.yaml cannot be read', async () => {
    const root = await tmp();
    const appDir = join(root, 'apps', 'web');
    await mkdir(appDir, { recursive: true });
    await writeFile(
      join(appDir, 'package.json'),
      JSON.stringify({
        name: 'web',
        dependencies: { '@geoql/v-maplibre': 'catalog:app:web' },
      }),
    );
    // findPnpmWorkspaceYaml stat()s a real file, but chmod 000 makes the later
    // readFile reject with EACCES, exercising the read-failure fallback.
    const wsPath = join(root, 'pnpm-workspace.yaml');
    await writeFile(
      wsPath,
      'catalogs:\n  app:web:\n    "@geoql/v-maplibre": ^1.2.0\n',
    );
    await chmod(wsPath, 0o000);
    const projectInfo: ProjectInfo = {
      ...nuxtProjectInfo,
      rootDirectory: appDir,
    };
    const config = await buildKnipConfig(projectInfo, baseConfig);
    expect(config.ignoreDependencies).not.toContain('@geoql/v-maplibre');
    await chmod(wsPath, 0o644);
  });

  it('skips a pnpm-workspace.yaml path that is a directory, not a file', async () => {
    const root = await tmp();
    const appDir = join(root, 'apps', 'web');
    await mkdir(appDir, { recursive: true });
    await writeFile(
      join(appDir, 'package.json'),
      JSON.stringify({
        name: 'web',
        dependencies: { '@geoql/v-maplibre': 'catalog:app:web' },
      }),
    );
    await mkdir(join(appDir, 'pnpm-workspace.yaml'));
    const projectInfo: ProjectInfo = {
      ...nuxtProjectInfo,
      rootDirectory: appDir,
    };
    const config = await buildKnipConfig(projectInfo, baseConfig);
    expect(config.ignoreDependencies).not.toContain('@geoql/v-maplibre');
  });

  it('resolves a catalog even when a top-level key precedes the catalogs block', async () => {
    const root = await tmp();
    const appDir = join(root, 'apps', 'web');
    await mkdir(appDir, { recursive: true });
    await writeFile(
      join(appDir, 'package.json'),
      JSON.stringify({
        name: 'web',
        dependencies: { '@geoql/v-maplibre': 'catalog:app:web' },
      }),
    );
    await writeFile(
      join(root, 'pnpm-workspace.yaml'),
      [
        'packages:',
        '  - "apps/*"',
        'catalogs:',
        '  app:web:',
        '    "@geoql/v-maplibre": ^1.2.0',
      ].join('\n') + '\n',
    );
    const projectInfo: ProjectInfo = {
      ...nuxtProjectInfo,
      rootDirectory: appDir,
    };
    const config = await buildKnipConfig(projectInfo, baseConfig);
    expect(config.ignoreDependencies).toContain('@geoql/v-maplibre');
  });

  it('ignores a non-key line inside the target catalog block', async () => {
    const root = await tmp();
    const appDir = join(root, 'apps', 'web');
    await mkdir(appDir, { recursive: true });
    await writeFile(
      join(appDir, 'package.json'),
      JSON.stringify({
        name: 'web',
        dependencies: { '@geoql/v-maplibre': 'catalog:app:web' },
      }),
    );
    await writeFile(
      join(root, 'pnpm-workspace.yaml'),
      [
        'catalogs:',
        '  app:web:',
        '    "@geoql/v-maplibre": ^1.2.0',
        '    "loose-value-without-a-colon"',
      ].join('\n') + '\n',
    );
    const projectInfo: ProjectInfo = {
      ...nuxtProjectInfo,
      rootDirectory: appDir,
    };
    const config = await buildKnipConfig(projectInfo, baseConfig);
    expect(config.ignoreDependencies).toContain('@geoql/v-maplibre');
    expect(config.ignoreDependencies).not.toContain(
      'loose-value-without-a-colon',
    );
  });

  it('ignores non-catalog version specifiers when collecting catalog names', async () => {
    const root = await tmp();
    const appDir = join(root, 'apps', 'web');
    await mkdir(appDir, { recursive: true });
    await writeFile(
      join(appDir, 'package.json'),
      JSON.stringify({
        name: 'web',
        dependencies: { vue: '^3.5.0', wrangler: 'catalog:app:web' },
      }),
    );
    await writeFile(
      join(root, 'pnpm-workspace.yaml'),
      'catalogs:\n  app:web:\n    wrangler: ^4.0.0\n',
    );
    const projectInfo: ProjectInfo = {
      ...nuxtProjectInfo,
      rootDirectory: appDir,
    };
    const config = await buildKnipConfig(projectInfo, baseConfig);
    expect(config.ignoreDependencies).toContain('wrangler');
    expect(config.ignoreDependencies).not.toContain('vue');
  });

  it('returns early when a workspace exists but no deps use the catalog protocol', async () => {
    const root = await tmp();
    const appDir = join(root, 'apps', 'web');
    await mkdir(appDir, { recursive: true });
    await writeFile(
      join(appDir, 'package.json'),
      JSON.stringify({ name: 'web', dependencies: { vue: '^3.5.0' } }),
    );
    await writeFile(
      join(root, 'pnpm-workspace.yaml'),
      'catalogs:\n  app:web:\n    vue: ^3.5.0\n',
    );
    const projectInfo: ProjectInfo = {
      ...nuxtProjectInfo,
      rootDirectory: appDir,
    };
    const config = await buildKnipConfig(projectInfo, baseConfig);
    expect(config.ignoreDependencies).toEqual([
      'vite-plus',
      '@geoql/vue-doctor',
      '@geoql/nuxt-doctor',
    ]);
  });
});
