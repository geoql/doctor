import type { NuxtConfigInfo } from '../../project-info/parse-nuxt-config.js';
import type { ProjectInfo } from '../../types/project-info.js';
import type { NuxtPostCheckIssue } from './types.js';

const RULE_ID = 'nuxt-doctor/nitro/compatibilityDate-set';

export function checkCompatibilityDateSet(
  projectInfo: ProjectInfo,
  nuxtConfig: NuxtConfigInfo | null,
): NuxtPostCheckIssue[] {
  if (projectInfo.packageJsonPath === null) return [];
  if (nuxtConfig?.compatibilityDate !== undefined) return [];

  const file = projectInfo.nuxtConfigPath ?? projectInfo.packageJsonPath;

  return [
    {
      ruleId: RULE_ID,
      file,
      line: 1,
      column: 1,
      severity: 'error',
      message:
        'No compatibilityDate is set. Nuxt 4 and Nitro require a compatibilityDate to pin deployment behaviour.',
      recommendation:
        "Add compatibilityDate: 'YYYY-MM-DD' to defineNuxtConfig in nuxt.config.",
    },
  ];
}
