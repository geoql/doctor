import type { ProjectInfo } from '../types/project-info.js';
import { listVueResolutions } from './list-vue-resolutions.js';
import type { DepsIssue } from './types.js';

const RULE_ID = 'vue-doctor/deps/duplicate-vue-versions';

export async function checkDuplicateVue(
  projectInfo: ProjectInfo,
): Promise<DepsIssue[]> {
  if (projectInfo.packageJsonPath === null) return [];

  const versions = await listVueResolutions(projectInfo.packageJsonPath);

  const uniqueVersions = [...new Set(versions)];
  if (uniqueVersions.length <= 1) return [];

  return [
    {
      ruleId: RULE_ID,
      file: projectInfo.packageJsonPath,
      line: 1,
      column: 1,
      severity: 'error',
      message: `Multiple versions of vue detected in node_modules: ${uniqueVersions.join(', ')}. Vue's reactivity system requires a single instance.`,
      recommendation:
        'Add "vue": "^3.5.0" to pnpm.overrides (or npm overrides) to deduplicate. Run pnpm dedupe.',
      versions: uniqueVersions,
    },
  ];
}
