import type { ProjectInfo } from '../types/project-info.js';
import type { BuildQualityIssue } from './types.js';
import { readDeps } from './read-deps.js';

const RULE_ID = 'vue-doctor/build-quality/vue-tsc-in-devDeps';
const DOCS = 'https://github.com/vuejs/language-tools/tree/master/packages/tsc';

export async function checkVueTsc(
  projectInfo: ProjectInfo,
): Promise<BuildQualityIssue[]> {
  if (projectInfo.packageJsonPath === null) return [];
  if (projectInfo.framework !== 'vue' && projectInfo.framework !== 'nuxt') {
    return [];
  }

  const deps = await readDeps(projectInfo.packageJsonPath);
  if (deps === null) return [];
  if (deps.devDependencies['vue-tsc']) return [];

  return [
    {
      ruleId: RULE_ID,
      file: projectInfo.packageJsonPath,
      line: 1,
      column: 1,
      severity: 'warn',
      message: `Vue projects should type-check with vue-tsc, but it is missing from devDependencies. See ${DOCS}`,
      recommendation: 'Add vue-tsc to devDependencies.',
    },
  ];
}
