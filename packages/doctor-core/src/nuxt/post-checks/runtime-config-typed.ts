import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { NuxtConfigInfo } from '../../project-info/parse-nuxt-config.js';
import type { ProjectInfo } from '../../types/project-info.js';
import type { NuxtPostCheckIssue } from './types.js';

const RULE_ID = 'nuxt-doctor/nitro/runtime-config-typed';

async function hasRuntimeConfigAugmentation(dir: string): Promise<boolean> {
  const entries = await readdir(dir);
  for (const name of entries) {
    if (!name.endsWith('.d.ts')) continue;
    const source = await readFile(join(dir, name), 'utf8');
    if (source.includes('RuntimeConfig')) return true;
  }
  return false;
}

export async function checkRuntimeConfigTyped(
  projectInfo: ProjectInfo,
  nuxtConfig: NuxtConfigInfo | null,
): Promise<NuxtPostCheckIssue[]> {
  if (projectInfo.packageJsonPath === null) return [];
  if (nuxtConfig?.hasRuntimeConfig !== true) return [];

  if (await hasRuntimeConfigAugmentation(projectInfo.rootDirectory)) return [];

  return [
    {
      ruleId: RULE_ID,
      file: projectInfo.packageJsonPath,
      line: 1,
      column: 1,
      severity: 'info',
      message:
        'runtimeConfig is defined but no RuntimeConfig type augmentation was found, so runtime config access is untyped.',
      recommendation:
        "Augment 'nuxt/schema' with a RuntimeConfig interface in a .d.ts file to type useRuntimeConfig().",
    },
  ];
}
