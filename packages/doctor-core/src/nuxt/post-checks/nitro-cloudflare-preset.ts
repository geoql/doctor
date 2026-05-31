import type { ProjectInfo } from '../../types/project-info.js';
import type { NuxtPostCheckIssue } from './types.js';

const RULE_ID = 'nuxt-doctor/cloudflare/nitro-cloudflare-preset';

const CLOUDFLARE_PRESETS = new Set([
  'cloudflare-pages',
  'cloudflare-module',
  'cloudflare',
]);

export function checkNitroCloudflarePreset(
  projectInfo: ProjectInfo,
): NuxtPostCheckIssue[] {
  if (projectInfo.packageJsonPath === null) return [];
  if (!projectInfo.hasWranglerConfig) return [];
  if (projectInfo.nitroPreset === null) return [];
  if (CLOUDFLARE_PRESETS.has(projectInfo.nitroPreset)) return [];

  const file = projectInfo.nuxtConfigPath ?? projectInfo.packageJsonPath;

  return [
    {
      ruleId: RULE_ID,
      file,
      line: 1,
      column: 1,
      severity: 'warn',
      message: `A wrangler config is present but the Nitro preset is '${projectInfo.nitroPreset}', not a Cloudflare preset.`,
      recommendation:
        "Set nitro.preset to 'cloudflare-module' (or 'cloudflare-pages') to deploy on Cloudflare.",
    },
  ];
}
