import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Framework, ProjectInfo } from '../../src/types/project-info.js';

export async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-bq-'));
  for (const [name, content] of Object.entries(files)) {
    const filePath = join(dir, name);
    await mkdir(join(dir, name.split('/').slice(0, -1).join('/') || '.'), {
      recursive: true,
    });
    await writeFile(filePath, content);
  }
  return dir;
}

export function makeProjectInfo(
  rootDirectory: string,
  overrides: {
    framework?: Framework;
    packageJsonPath?: string | null;
  } = {},
): ProjectInfo {
  return {
    framework: overrides.framework ?? 'vue',
    rootDirectory,
    packageJsonPath:
      overrides.packageJsonPath === undefined
        ? join(rootDirectory, 'package.json')
        : overrides.packageJsonPath,
    vueVersion: null,
    nuxtVersion: null,
    typescriptVersion: null,
    hasAutoImports: false,
    hasComponentsAutoImport: false,
    hasPinia: false,
    hasVueRouter: false,
    nitroPreset: null,
    nuxtCompatibilityVersion: null,
    monorepoKind: null,
    capabilities: new Set(),
  };
}
