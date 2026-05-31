import { readDeps } from '../../build-quality/read-deps.js';
import type { ProjectInfo } from '../../types/project-info.js';
import type { NuxtPostCheckIssue } from './types.js';

const RULE_ID = 'nuxt-doctor/modules-deps/recommended-modules-installed';

interface RecommendedGroup {
  readonly label: string;
  readonly candidates: readonly string[];
}

const RECOMMENDED_GROUPS: readonly RecommendedGroup[] = [
  { label: '@nuxt/image', candidates: ['@nuxt/image'] },
  { label: '@nuxtjs/seo', candidates: ['@nuxtjs/seo', '@nuxtjs/sitemap'] },
  { label: '@nuxt/fonts', candidates: ['@nuxt/fonts'] },
];

export async function checkRecommendedModulesInstalled(
  projectInfo: ProjectInfo,
): Promise<NuxtPostCheckIssue[]> {
  if (projectInfo.packageJsonPath === null) return [];

  const deps = await readDeps(projectInfo.packageJsonPath);
  if (deps === null) return [];

  const installed = new Set([
    ...Object.keys(deps.dependencies),
    ...Object.keys(deps.devDependencies),
  ]);

  const missing = RECOMMENDED_GROUPS.filter(
    (group) => !group.candidates.some((name) => installed.has(name)),
  );

  return missing.map((group, index) => ({
    ruleId: RULE_ID,
    file: projectInfo.packageJsonPath as string,
    line: index + 1,
    column: 1,
    severity: 'info',
    message: `Recommended Nuxt 4 module ${group.label} is not installed.`,
    recommendation: `Add ${group.label} to dependencies to improve image, SEO, or font handling.`,
  }));
}
