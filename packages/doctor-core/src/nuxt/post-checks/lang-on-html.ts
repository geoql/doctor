import type { NuxtConfigInfo } from '../../project-info/parse-nuxt-config.js';
import type { ProjectInfo } from '../../types/project-info.js';
import type { NuxtPostCheckIssue } from './types.js';

const RULE_ID = 'nuxt-doctor/seo/lang-on-html';

export function checkLangOnHtml(
  projectInfo: ProjectInfo,
  nuxtConfig: NuxtConfigInfo | null,
): NuxtPostCheckIssue[] {
  if (projectInfo.packageJsonPath === null) return [];
  if (nuxtConfig?.htmlLang !== undefined) return [];

  const file = projectInfo.nuxtConfigPath ?? projectInfo.packageJsonPath;

  return [
    {
      ruleId: RULE_ID,
      file,
      line: 1,
      column: 1,
      severity: 'warn',
      message:
        'No lang attribute is set on the html element. Screen readers and search engines rely on it.',
      recommendation:
        "Set app.head.htmlAttrs.lang (e.g. 'en') in defineNuxtConfig.",
    },
  ];
}
