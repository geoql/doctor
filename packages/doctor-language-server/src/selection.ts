import type { Framework, ProjectInfo } from '@geoql/doctor-core';

/** Editor-facing project flavor the audit runs as. */
export type DoctorProjectKind = 'vue' | 'nuxt' | 'unknown';

/**
 * Picks which doctor plugin set applies to a project from its detected
 * framework. Nuxt projects get the Nuxt + Vue rule passes; plain Vue
 * projects get the Vue passes; an unrecognized project is `unknown` and the
 * server skips auditing it (no framework → no applicable rules).
 */
export const selectProjectKind = (
  project: Pick<ProjectInfo, 'framework'>,
): DoctorProjectKind => {
  const framework: Framework = project.framework;
  if (framework === 'nuxt') return 'nuxt';
  if (framework === 'vue') return 'vue';
  return 'unknown';
};

/** Whether a detected project is one doctor can audit (Vue or Nuxt). */
export const isAuditableProject = (
  project: Pick<ProjectInfo, 'framework'>,
): boolean => selectProjectKind(project) !== 'unknown';
