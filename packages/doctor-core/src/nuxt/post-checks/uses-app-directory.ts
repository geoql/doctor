import type { ProjectInfo } from '../../types/project-info.js';
import type { NuxtPostCheckIssue } from './types.js';

const RULE_ID = 'nuxt-doctor/structure/uses-app-directory';

export function checkUsesAppDirectory(
  projectInfo: ProjectInfo,
): NuxtPostCheckIssue[] {
  if (projectInfo.packageJsonPath === null) return [];
  if (projectInfo.hasAppDir) return [];

  return [
    {
      ruleId: RULE_ID,
      file: projectInfo.packageJsonPath,
      line: 1,
      column: 1,
      severity: 'warn',
      message:
        'No app/ directory found. Nuxt 4 expects source under app/ (app/pages, app/components, app/app.vue).',
      recommendation:
        'Create an app/ directory and move pages, components, layouts, and app.vue into it.',
    },
  ];
}
