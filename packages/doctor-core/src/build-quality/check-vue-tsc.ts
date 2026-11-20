import type { ProjectInfo } from '../types/project-info.js';
import type { BuildQualityIssue } from './types.js';
import { readDeps } from './read-deps.js';

const RULE_ID = 'vue-doctor/build-quality/vue-tsc-in-devDeps';
const DOCS = 'https://github.com/vuejs/language-tools/tree/master/packages/tsc';

/**
 * True when this rule requires `vue-tsc` in devDependencies. Dead-code must
 * then never report it unused: `nuxt typecheck` and editor tooling spawn it as
 * a binary, so nothing imports it (issue #323).
 */
export function requiresVueTsc(projectInfo: ProjectInfo): boolean {
  return projectInfo.framework === 'vue' || projectInfo.framework === 'nuxt';
}

export async function checkVueTsc(
  projectInfo: ProjectInfo,
): Promise<BuildQualityIssue[]> {
  if (projectInfo.packageJsonPath === null) return [];
  if (!requiresVueTsc(projectInfo)) return [];

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
