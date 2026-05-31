import type { Diagnostic } from './types.js';
import type { ProjectInfo } from './types/project-info.js';
import { checkDuplicateVue } from './deps/check-duplicate-vue.js';
import { checkVueMajorCurrent } from './deps/check-vue-major-current.js';
import type { DepsIssue } from './deps/types.js';

export async function checkDeps(
  projectInfo: ProjectInfo,
): Promise<Diagnostic[]> {
  if (projectInfo.packageJsonPath === null) return [];

  const results = await Promise.all([
    checkDuplicateVue(projectInfo),
    Promise.resolve(checkVueMajorCurrent(projectInfo)),
  ]);

  const issues: DepsIssue[] = results.flat();

  return issues.map((issue) => ({
    file: issue.file,
    line: issue.line,
    column: issue.column,
    ruleId: issue.ruleId,
    severity: issue.severity,
    message: issue.message,
    source: 'deps',
    recommendation: issue.recommendation,
  }));
}
