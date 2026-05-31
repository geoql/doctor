import { readDeps } from '../../build-quality/read-deps.js';
import type { ProjectInfo } from '../../types/project-info.js';
import type { NuxtPostCheckIssue } from './types.js';

const RULE_ID = 'nuxt-doctor/cloudflare/no-node-only-modules';

// Modules that rely on native bindings or the Node runtime and do not work on
// the Cloudflare Workers runtime without a compatible replacement.
const NODE_ONLY_MODULES = new Set(['fs-extra', 'sharp']);

export async function checkNoNodeOnlyModules(
  projectInfo: ProjectInfo,
): Promise<NuxtPostCheckIssue[]> {
  if (projectInfo.packageJsonPath === null) return [];
  if (!projectInfo.hasWranglerConfig) return [];

  const deps = await readDeps(projectInfo.packageJsonPath);
  if (deps === null) return [];

  const offenders: string[] = [];
  for (const key of [
    ...Object.keys(deps.dependencies),
    ...Object.keys(deps.devDependencies),
  ]) {
    if (NODE_ONLY_MODULES.has(key) && !offenders.includes(key)) {
      offenders.push(key);
    }
  }

  return offenders.map((name, index) => ({
    ruleId: RULE_ID,
    file: projectInfo.packageJsonPath as string,
    line: index + 1,
    column: 1,
    severity: 'warn',
    message: `${name} is a Node-only module and does not run on the Cloudflare Workers runtime.`,
    recommendation: `Replace ${name} with a Workers-compatible alternative or move it to a build-only step.`,
  }));
}
