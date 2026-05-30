import type { ProjectInfo } from '../types/project-info.js';
import type { BuildQualityIssue } from './types.js';
import { readDeps } from './read-deps.js';

const RULE_ID = 'vue-doctor/build-quality/no-vue-cli';
const DOCS = 'https://cli.vuejs.org/migrations/migrate-from-v4.html';

function isOffendingKey(key: string): boolean {
  return key === '@vue/cli-service' || key.startsWith('vue-cli-plugin-');
}

export async function checkNoVueCli(
  projectInfo: ProjectInfo,
): Promise<BuildQualityIssue[]> {
  if (projectInfo.packageJsonPath === null) return [];

  const deps = await readDeps(projectInfo.packageJsonPath);
  if (deps === null) return [];

  const offenders: string[] = [];
  for (const key of [
    ...Object.keys(deps.dependencies),
    ...Object.keys(deps.devDependencies),
  ]) {
    if (isOffendingKey(key) && !offenders.includes(key)) offenders.push(key);
  }

  return offenders.map((key, index) => ({
    ruleId: RULE_ID,
    file: projectInfo.packageJsonPath as string,
    line: index + 1,
    column: 1,
    severity: 'warn',
    message: `${key} indicates Vue CLI, which is deprecated; migrate to Vite. See ${DOCS}`,
    recommendation: `Remove ${key} and migrate the build to Vite.`,
  }));
}
