import { join } from 'node:path';
import { gte, major, minor } from 'semver';
import { findMonorepoRoot } from './project-info/find-monorepo-root.js';
import { parseNuxtConfig } from './project-info/parse-nuxt-config.js';
import { parseNuxtVersion } from './project-info/parse-nuxt-version.js';
import { parseVueVersion } from './project-info/parse-vue-version.js';
import { pathExists } from './project-info/path-exists.js';
import type { PackageJson } from './project-info/read-package-json.js';
import { readPackageJson } from './project-info/read-package-json.js';
import { resolveDepVersion } from './project-info/resolve-dep-version.js';
import type {
  Capability,
  Framework,
  MonorepoKind,
  ProjectInfo,
} from './types/project-info.js';

interface DetectionInput {
  framework: Framework;
  vueVersion: string | null;
  nuxtVersion: string | null;
  typescriptVersion: string | null;
  hasTypescript: boolean;
  hasAutoImports: boolean;
  hasComponentsAutoImport: boolean;
  hasPinia: boolean;
  hasVueRouter: boolean;
  nitroPreset: string | null;
  nuxtCompatibilityVersion: 3 | 4 | null;
  monorepoKind: MonorepoKind;
  hasWrangler: boolean;
}

function hasDependency(pkg: PackageJson | null, name: string): boolean {
  return Boolean(pkg?.dependencies?.[name] ?? pkg?.devDependencies?.[name]);
}

function resolveFramework(pkg: PackageJson | null): Framework {
  if (hasDependency(pkg, 'nuxt')) return 'nuxt';
  if (hasDependency(pkg, 'vue')) return 'vue';
  return 'unknown';
}

function resolveCompatibility(
  nuxtVersion: string | null,
  compatibilityVersion: number | undefined,
): 3 | 4 | null {
  const nuxtMajor = nuxtVersion ? major(nuxtVersion) : 0;
  if (compatibilityVersion === 4 || nuxtMajor >= 4) return 4;
  if (compatibilityVersion === 3) return 3;
  return null;
}

function buildCapabilities(input: DetectionInput): Set<Capability> {
  const caps = new Set<Capability>();
  if (input.framework === 'unknown') return caps;

  if (input.vueVersion && major(input.vueVersion) === 3) {
    caps.add('vue:3');
    if (minor(input.vueVersion) >= 4) caps.add('vue:3.4');
    if (minor(input.vueVersion) >= 5) caps.add('vue:3.5');
  }

  if (input.nuxtCompatibilityVersion === 4) caps.add('nuxt:4');
  if (input.nuxtVersion && gte(input.nuxtVersion, '4.4.0'))
    caps.add('nuxt:4.4');

  if (input.hasAutoImports) caps.add('auto-imports:vue');
  if (input.hasComponentsAutoImport) caps.add('components:auto');
  if (input.hasPinia) caps.add('pinia');
  if (input.hasVueRouter) caps.add('vue-router');

  if (input.hasTypescript) caps.add('typescript');
  if (input.typescriptVersion && major(input.typescriptVersion) >= 6) {
    caps.add('typescript:6');
  }

  if (
    input.monorepoKind === 'pnpm' ||
    input.monorepoKind === 'yarn' ||
    input.monorepoKind === 'npm'
  ) {
    caps.add(`monorepo:${input.monorepoKind}`);
  }

  if (input.hasWrangler || input.nitroPreset === 'cloudflare-pages') {
    caps.add('cf-pages:enabled');
  }
  if (input.nitroPreset === 'node-server') caps.add('nitro:node-server');

  return caps;
}

export async function detectProject(
  rootDirectory: string,
): Promise<ProjectInfo> {
  const pkg = await readPackageJson(rootDirectory);
  const packageJsonPath = pkg ? join(rootDirectory, 'package.json') : null;
  const { root: monorepoRoot, kind: monorepoKind } =
    await findMonorepoRoot(rootDirectory);

  const framework = resolveFramework(pkg);
  const vueVersion = await parseVueVersion(rootDirectory, monorepoRoot, pkg);
  const nuxtVersion = await parseNuxtVersion(rootDirectory, monorepoRoot, pkg);
  const typescriptVersion = await resolveDepVersion(
    'typescript',
    rootDirectory,
    monorepoRoot,
    pkg,
  );

  const nuxtConfig =
    framework === 'nuxt' ? await parseNuxtConfig(rootDirectory) : null;
  const nitroPreset = nuxtConfig?.nitroPreset ?? null;
  const nuxtCompatibilityVersion = resolveCompatibility(
    nuxtVersion,
    nuxtConfig?.compatibilityVersion,
  );

  const isNuxt = framework === 'nuxt';
  const hasAutoImports = isNuxt
    ? nuxtConfig?.importsAutoImport !== false
    : hasDependency(pkg, 'unplugin-auto-import');
  const hasComponentsAutoImport =
    isNuxt || hasDependency(pkg, 'unplugin-vue-components');
  const hasPinia = hasDependency(pkg, 'pinia');
  const hasVueRouter = hasDependency(pkg, 'vue-router') && !isNuxt;

  const tsconfigExists = await pathExists(join(rootDirectory, 'tsconfig.json'));
  const hasTypescript = hasDependency(pkg, 'typescript') || tsconfigExists;

  const hasWrangler =
    (await pathExists(join(rootDirectory, 'wrangler.toml'))) ||
    (await pathExists(join(rootDirectory, 'wrangler.jsonc')));

  const capabilities = buildCapabilities({
    framework,
    vueVersion,
    nuxtVersion,
    typescriptVersion,
    hasTypescript,
    hasAutoImports,
    hasComponentsAutoImport,
    hasPinia,
    hasVueRouter,
    nitroPreset,
    nuxtCompatibilityVersion,
    monorepoKind,
    hasWrangler,
  });

  return {
    framework,
    rootDirectory,
    packageJsonPath,
    vueVersion,
    nuxtVersion,
    typescriptVersion,
    hasAutoImports,
    hasComponentsAutoImport,
    hasPinia,
    hasVueRouter,
    nitroPreset,
    nuxtCompatibilityVersion,
    monorepoKind,
    capabilities,
  };
}
