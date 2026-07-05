import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ProjectInfo } from '../../../src/types/project-info.js';

export async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-nuxt-pc-'));
  for (const [name, content] of Object.entries(files)) {
    const filePath = join(dir, name);
    await mkdir(join(dir, name.split('/').slice(0, -1).join('/') || '.'), {
      recursive: true,
    });
    await writeFile(filePath, content);
  }
  return dir;
}

export function makeNuxtProject(
  overrides: Partial<ProjectInfo> = {},
): ProjectInfo {
  return {
    framework: 'nuxt',
    frameworkDetected: true,
    rootDirectory: '/x',
    packageJsonPath: '/x/package.json',
    vueVersion: null,
    nuxtVersion: '4.4.0',
    typescriptVersion: '6.0.3',
    hasAutoImports: true,
    hasComponentsAutoImport: true,
    hasPinia: false,
    hasVueRouter: false,
    nitroPreset: null,
    nuxtCompatibilityVersion: 4,
    monorepoKind: null,
    nuxtConfigPath: '/x/nuxt.config.ts',
    hasAppDir: true,
    appDirPath: '/x/app',
    hasServerDir: false,
    hasPagesDir: false,
    hasWranglerConfig: false,
    capabilities: new Set(),
    ...overrides,
  };
}
