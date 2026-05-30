import type { Diagnostic } from './types.js';
import type { ProjectInfo } from './types/project-info.js';
import { checkEslintPluginVue } from './build-quality/check-eslint-plugin-vue.js';
import { checkNoVueCli } from './build-quality/check-no-vue-cli.js';
import { checkTsconfigStrict } from './build-quality/check-tsconfig-strict.js';
import { checkVueTsc } from './build-quality/check-vue-tsc.js';
import type { BuildQualityIssue } from './build-quality/types.js';

export async function checkBuildQuality(
  projectInfo: ProjectInfo,
): Promise<Diagnostic[]> {
  if (projectInfo.packageJsonPath === null) return [];

  const results = await Promise.all([
    checkTsconfigStrict(projectInfo),
    checkVueTsc(projectInfo),
    checkNoVueCli(projectInfo),
    checkEslintPluginVue(projectInfo),
  ]);

  const issues: BuildQualityIssue[] = results.flat();

  return issues.map((issue) => ({
    file: issue.file,
    line: issue.line,
    column: issue.column,
    ruleId: issue.ruleId,
    severity: issue.severity,
    message: issue.message,
    source: 'project',
    recommendation: issue.recommendation,
  }));
}
