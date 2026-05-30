import type { ProjectInfo } from '../types/project-info.js';
import type { BuildQualityIssue } from './types.js';
import { readDeps } from './read-deps.js';

const RULE_ID = 'vue-doctor/build-quality/eslint-plugin-vue-installed';
const DOCS = 'https://eslint.vuejs.org/';

export async function checkEslintPluginVue(
  projectInfo: ProjectInfo,
): Promise<BuildQualityIssue[]> {
  if (projectInfo.packageJsonPath === null) return [];
  if (projectInfo.framework !== 'vue' && projectInfo.framework !== 'nuxt') {
    return [];
  }

  const deps = await readDeps(projectInfo.packageJsonPath);
  if (deps === null) return [];
  if (deps.devDependencies['eslint-plugin-vue']) return [];

  return [
    {
      ruleId: RULE_ID,
      file: projectInfo.packageJsonPath,
      line: 1,
      column: 1,
      severity: 'info',
      message: `eslint-plugin-vue is not in devDependencies; it catches many Vue-specific issues. See ${DOCS}`,
      recommendation: 'Add eslint-plugin-vue to devDependencies.',
    },
  ];
}
