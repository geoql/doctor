import type { ProjectInfo } from '../types/project-info.js';
import type { DepsIssue } from './types.js';

const RULE_ID = 'vue-doctor/deps/vue-major-current';

const DOCTOR_BUNDLED_VUE_FLOOR_MAJOR = 3;
const DOCTOR_BUNDLED_VUE_FLOOR_MINOR = 5;

function parseMajorMinor(
  version: string,
): { major: number; minor: number } | null {
  const match = /^v?(\d+)\.(\d+)/.exec(version.trim());
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]) };
}

export function checkVueMajorCurrent(projectInfo: ProjectInfo): DepsIssue[] {
  if (projectInfo.packageJsonPath === null) return [];
  if (projectInfo.vueVersion === null) return [];

  const parsed = parseMajorMinor(projectInfo.vueVersion);
  if (parsed === null) return [];

  if (parsed.major !== DOCTOR_BUNDLED_VUE_FLOOR_MAJOR) return [];
  if (parsed.minor >= DOCTOR_BUNDLED_VUE_FLOOR_MINOR) return [];

  return [
    {
      ruleId: RULE_ID,
      file: projectInfo.packageJsonPath,
      line: 1,
      column: 1,
      severity: 'info',
      message: `Vue ${projectInfo.vueVersion} is older than the doctor-bundled floor (^${DOCTOR_BUNDLED_VUE_FLOOR_MAJOR}.${DOCTOR_BUNDLED_VUE_FLOOR_MINOR}.0). Newer minors often ship rule-relevant features (e.g. 3.4 reactive props destructure, 3.5 useTemplateRef).`,
      recommendation: `Bump "vue" to ^${DOCTOR_BUNDLED_VUE_FLOOR_MAJOR}.${DOCTOR_BUNDLED_VUE_FLOOR_MINOR}.0 or later in package.json.`,
    },
  ];
}
