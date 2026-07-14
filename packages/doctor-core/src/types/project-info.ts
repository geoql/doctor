export type Framework = 'vue' | 'nuxt' | 'unknown';

// The closed set of capability tokens the detectors emit. A strict union (not
// `string`) so a misspelled token — `'nuxt4'` vs `'nuxt:4'` — fails tsc at the
// rule's requires/disabledBy gate instead of silently never matching.
export const CAPABILITIES = [
  'vue:3',
  'vue:3.4',
  'vue:3.5',
  'vue:vapor',
  'nuxt:4',
  'nuxt:4.4',
  'nuxt4',
  'nuxt-config',
  'app-dir',
  'server-dir',
  'pages-dir',
  'wrangler',
  'auto-imports:vue',
  'components:auto',
  'pinia',
  'vue-router',
  'typescript',
  'typescript:6',
  'monorepo:pnpm',
  'monorepo:yarn',
  'monorepo:npm',
  'cf-pages:enabled',
  'nitro:node-server',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export type MonorepoKind = 'pnpm' | 'yarn' | 'npm' | 'turbo' | null;

export interface ProjectInfo {
  readonly framework: Framework;
  readonly frameworkDetected: boolean;
  readonly rootDirectory: string;
  readonly packageJsonPath: string | null;
  readonly vueVersion: string | null;
  readonly nuxtVersion: string | null;
  readonly typescriptVersion: string | null;
  readonly hasAutoImports: boolean;
  readonly hasComponentsAutoImport: boolean;
  readonly hasPinia: boolean;
  readonly hasVueRouter: boolean;
  readonly nitroPreset: string | null;
  readonly nuxtCompatibilityVersion: 3 | 4 | null;
  readonly monorepoKind: MonorepoKind;
  readonly nuxtConfigPath: string | null;
  readonly hasAppDir: boolean;
  readonly appDirPath: string | null;
  readonly hasServerDir: boolean;
  readonly hasPagesDir: boolean;
  readonly hasWranglerConfig: boolean;
  readonly capabilities: ReadonlySet<Capability>;
}
