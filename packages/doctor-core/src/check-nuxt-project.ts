import { parseNuxtConfig } from './project-info/parse-nuxt-config.js';
import { checkCompatibilityDateSet } from './nuxt/post-checks/compatibility-date-set.js';
import { checkLangOnHtml } from './nuxt/post-checks/lang-on-html.js';
import { checkNitroCloudflarePreset } from './nuxt/post-checks/nitro-cloudflare-preset.js';
import { checkNoModulesIncompatibleWithNuxt4 } from './nuxt/post-checks/no-modules-incompatible-with-nuxt-4.js';
import { checkNoNodeOnlyModules } from './nuxt/post-checks/no-node-only-modules.js';
import { checkNoSecretInPublicRuntimeConfig } from './nuxt/post-checks/no-secret-in-public-runtime-config.js';
import { checkNuxtMajorCurrent } from './nuxt/post-checks/nuxt-major-current.js';
import { checkOgImageViaSatori } from './nuxt/post-checks/og-image-via-satori.js';
import { checkPresetDefinedForDeployTarget } from './nuxt/post-checks/preset-defined-for-deploy-target.js';
import { checkRecommendedModulesInstalled } from './nuxt/post-checks/recommended-modules-installed.js';
import { checkRuntimeConfigTyped } from './nuxt/post-checks/runtime-config-typed.js';
import type { NuxtPostCheckIssue } from './nuxt/post-checks/types.js';
import { checkUsesAppDirectory } from './nuxt/post-checks/uses-app-directory.js';
import type { Diagnostic } from './types.js';
import type { ProjectInfo } from './types/project-info.js';

export async function checkNuxtProject(
  projectInfo: ProjectInfo,
): Promise<Diagnostic[]> {
  if (projectInfo.packageJsonPath === null) return [];
  if (projectInfo.framework !== 'nuxt') return [];

  const nuxtConfig = await parseNuxtConfig(projectInfo.rootDirectory);

  const results = await Promise.all([
    Promise.resolve(checkUsesAppDirectory(projectInfo)),
    Promise.resolve(checkNuxtMajorCurrent(projectInfo)),
    checkNoModulesIncompatibleWithNuxt4(projectInfo),
    checkRecommendedModulesInstalled(projectInfo),
    Promise.resolve(checkCompatibilityDateSet(projectInfo, nuxtConfig)),
    Promise.resolve(checkPresetDefinedForDeployTarget(projectInfo)),
    checkRuntimeConfigTyped(projectInfo, nuxtConfig),
    Promise.resolve(checkLangOnHtml(projectInfo, nuxtConfig)),
    Promise.resolve(checkNitroCloudflarePreset(projectInfo)),
    checkOgImageViaSatori(projectInfo),
    checkNoNodeOnlyModules(projectInfo),
    checkNoSecretInPublicRuntimeConfig(projectInfo),
  ]);

  const issues: NuxtPostCheckIssue[] = results.flat();

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
