import type { ProjectInfo } from '../../types/project-info.js';
import type { NuxtPostCheckIssue } from './types.js';

const RULE_ID = 'nuxt-doctor/nitro/preset-defined-for-deploy-target';

export function checkPresetDefinedForDeployTarget(
  projectInfo: ProjectInfo,
): NuxtPostCheckIssue[] {
  if (projectInfo.packageJsonPath === null) return [];
  if (!projectInfo.hasWranglerConfig) return [];
  if (projectInfo.nitroPreset !== null) return [];

  const file = projectInfo.nuxtConfigPath ?? projectInfo.packageJsonPath;

  return [
    {
      ruleId: RULE_ID,
      file,
      line: 1,
      column: 1,
      severity: 'warn',
      message:
        'A wrangler config is present but no Nitro preset is defined for the deploy target.',
      recommendation:
        "Set nitro.preset in nuxt.config (e.g. 'cloudflare-module') to match your deploy target.",
    },
  ];
}
