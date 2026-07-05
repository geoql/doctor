export type Framework = 'vue' | 'nuxt' | 'unknown';

export type Capability = string;

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
