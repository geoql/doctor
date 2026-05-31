import { readDeps } from '../../build-quality/read-deps.js';
import type { ProjectInfo } from '../../types/project-info.js';
import type { NuxtPostCheckIssue } from './types.js';

const RULE_ID = 'nuxt-doctor/cloudflare/og-image-via-satori';

const OG_IMAGE_MODULES = ['@nuxtjs/og-image', 'nuxt-og-image'];

export async function checkOgImageViaSatori(
  projectInfo: ProjectInfo,
): Promise<NuxtPostCheckIssue[]> {
  if (projectInfo.packageJsonPath === null) return [];
  if (!projectInfo.hasWranglerConfig) return [];

  const deps = await readDeps(projectInfo.packageJsonPath);
  if (deps === null) return [];

  const installed = new Set([
    ...Object.keys(deps.dependencies),
    ...Object.keys(deps.devDependencies),
  ]);
  if (OG_IMAGE_MODULES.some((name) => installed.has(name))) return [];

  return [
    {
      ruleId: RULE_ID,
      file: projectInfo.packageJsonPath,
      line: 1,
      column: 1,
      severity: 'info',
      message:
        'Running on Cloudflare with no OG image module installed; dynamic social images are unconfigured.',
      recommendation:
        'Add @nuxtjs/og-image to generate Satori-based OG images that run on Cloudflare Workers.',
    },
  ];
}
