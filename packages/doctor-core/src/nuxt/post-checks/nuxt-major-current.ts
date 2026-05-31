import type { ProjectInfo } from '../../types/project-info.js';
import type { NuxtPostCheckIssue } from './types.js';

const RULE_ID = 'nuxt-doctor/structure/nuxt-major-current';

const DOCTOR_BUNDLED_NUXT_FLOOR_MAJOR = 4;
const DOCTOR_BUNDLED_NUXT_FLOOR_MINOR = 4;

function parseMajorMinor(
  version: string,
): { major: number; minor: number } | null {
  const match = /^v?(\d+)\.(\d+)/.exec(version.trim());
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]) };
}

export function checkNuxtMajorCurrent(
  projectInfo: ProjectInfo,
): NuxtPostCheckIssue[] {
  if (projectInfo.packageJsonPath === null) return [];
  if (projectInfo.nuxtVersion === null) return [];

  const parsed = parseMajorMinor(projectInfo.nuxtVersion);
  if (parsed === null) return [];

  if (parsed.major !== DOCTOR_BUNDLED_NUXT_FLOOR_MAJOR) return [];
  if (parsed.minor >= DOCTOR_BUNDLED_NUXT_FLOOR_MINOR) return [];

  return [
    {
      ruleId: RULE_ID,
      file: projectInfo.packageJsonPath,
      line: 1,
      column: 1,
      severity: 'info',
      message: `Nuxt ${projectInfo.nuxtVersion} is older than the doctor-bundled floor (^${DOCTOR_BUNDLED_NUXT_FLOOR_MAJOR}.${DOCTOR_BUNDLED_NUXT_FLOOR_MINOR}.0). Newer minors ship rule-relevant fixes and Nitro improvements.`,
      recommendation: `Bump "nuxt" to ^${DOCTOR_BUNDLED_NUXT_FLOOR_MAJOR}.${DOCTOR_BUNDLED_NUXT_FLOOR_MINOR}.0 or later in package.json.`,
    },
  ];
}
