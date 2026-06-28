import { readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
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

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

async function findPnpmWorkspaceYaml(startDir: string): Promise<string | null> {
  let dir = startDir;
  for (let i = 0; i < 5; i++) {
    const candidate = join(dir, 'pnpm-workspace.yaml');
    try {
      const s = await stat(candidate);
      if (s.isFile()) return candidate;
    } catch {
      /* empty */
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function collectCatalogNames(packageJson: PackageJson): Set<string> {
  const names = new Set<string>();
  const fields = [
    packageJson.dependencies,
    packageJson.devDependencies,
    packageJson.peerDependencies,
    packageJson.optionalDependencies,
  ];
  for (const field of fields) {
    if (!field) continue;
    for (const version of Object.values(field)) {
      if (typeof version === 'string' && version.startsWith('catalog:')) {
        names.add(version.slice('catalog:'.length));
      }
    }
  }
  return names;
}

function extractCatalogDependencies(
  workspaceYaml: string,
  catalogName: string,
): string[] {
  const lines = workspaceYaml.split(/\r?\n/);
  const deps: string[] = [];
  let inCatalogs = false;
  let inTargetBlock = false;
  let blockIndent = -1;

  const escapedCatalogName = catalogName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const catalogPattern = new RegExp(`^${escapedCatalogName}\\s*:\\s*$`);

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    if (!inCatalogs) {
      if (/^catalogs\s*:/.test(trimmed)) {
        inCatalogs = true;
      }
      continue;
    }

    const indent = line.length - line.trimStart().length;

    if (inTargetBlock) {
      if (indent <= blockIndent) {
        break;
      }
      const match = line.match(/^[ \t]*["']?([@a-zA-Z0-9_./-]+)["']?[ \t]*:/);
      if (match) {
        deps.push(match[1]);
      }
      continue;
    }

    if (catalogPattern.test(trimmed)) {
      inTargetBlock = true;
      blockIndent = indent;
    } else if (
      indent === 0 &&
      /^\w+/.test(trimmed) &&
      !/^catalogs\b/.test(trimmed)
    ) {
      break;
    }
  }

  return deps;
}

async function resolveCatalogDependencies(
  rootDirectory: string,
): Promise<string[]> {
  const workspacePath = await findPnpmWorkspaceYaml(rootDirectory);
  if (!workspacePath) return [];

  let packageJson: PackageJson;
  try {
    packageJson = JSON.parse(
      await readFile(join(rootDirectory, 'package.json'), 'utf8'),
    );
  } catch {
    return [];
  }

  const catalogNames = collectCatalogNames(packageJson);
  if (catalogNames.size === 0) return [];

  let workspaceYaml: string;
  try {
    workspaceYaml = await readFile(workspacePath, 'utf8');
  } catch {
    return [];
  }

  const resolved = new Set<string>();
  for (const catalogName of catalogNames) {
    for (const dep of extractCatalogDependencies(workspaceYaml, catalogName)) {
      resolved.add(dep);
    }
  }
  return [...resolved];
}

export async function buildKnipConfig(
  projectInfo: ProjectInfo,
  doctorConfig: ResolvedDoctorConfig,
): Promise<KnipConfig> {
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

  const catalogDependencies = await resolveCatalogDependencies(
    projectInfo.rootDirectory,
  );

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
      ...new Set([
        'vite-plus',
        '@geoql/vue-doctor',
        '@geoql/nuxt-doctor',
        ...catalogDependencies,
      ]),
    ],
    ignoreWorkspaces: [...DEMO_WORKSPACES],
  };

  if (isNuxt) {
    config.compilers = { nuxt: true };
  }

  return config;
}
