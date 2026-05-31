import { readDeps } from '../../build-quality/read-deps.js';
import type { ProjectInfo } from '../../types/project-info.js';
import type { NuxtPostCheckIssue } from './types.js';

const RULE_ID = 'nuxt-doctor/modules-deps/no-modules-incompatible-with-nuxt-4';

const INCOMPATIBLE_MODULES = new Set([
  '@nuxtjs/composition-api',
  '@nuxt/bridge',
  'nuxt-property-decorator',
]);

export async function checkNoModulesIncompatibleWithNuxt4(
  projectInfo: ProjectInfo,
): Promise<NuxtPostCheckIssue[]> {
  if (projectInfo.packageJsonPath === null) return [];

  const deps = await readDeps(projectInfo.packageJsonPath);
  if (deps === null) return [];

  const offenders: string[] = [];
  for (const key of [
    ...Object.keys(deps.dependencies),
    ...Object.keys(deps.devDependencies),
  ]) {
    if (INCOMPATIBLE_MODULES.has(key) && !offenders.includes(key)) {
      offenders.push(key);
    }
  }

  return offenders.map((name, index) => ({
    ruleId: RULE_ID,
    file: projectInfo.packageJsonPath as string,
    line: index + 1,
    column: 1,
    severity: 'warn',
    message: `${name} is incompatible with Nuxt 4 and is no longer maintained.`,
    recommendation: `Remove ${name} and adopt the Nuxt 4 native equivalent.`,
  }));
}
