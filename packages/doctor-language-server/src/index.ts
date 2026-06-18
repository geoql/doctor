import { createServer, startLanguageServer } from './server.js';
import {
  createVersionCache,
  shouldAuditVersion,
  type VersionCache,
} from './cache.js';
import {
  createScheduler,
  type CancellationToken,
  type Scheduler,
  type SchedulerOptions,
} from './scheduler.js';
import { groupDiagnosticsByUri, type GroupDiagnosticsInput } from './group.js';
import { toLspDiagnostic, type MapDiagnosticInput } from './mapper.js';
import {
  rangeFromLineColumn,
  rangesOverlap,
  toZeroBasedPosition,
} from './positions.js';
import { severityLabel, toLspSeverity } from './severity.js';
import {
  isAuditableProject,
  selectProjectKind,
  type DoctorProjectKind,
} from './selection.js';
import { diagnosticFileToUri, uriToFsPath } from './uri.js';
import {
  DIAGNOSTIC_SOURCE,
  DOCUMENT_CHANGE_DEBOUNCE_MS,
  INITIAL_WORKSPACE_SCAN_DELAY_MS,
  SCANNABLE_EXTENSIONS,
  SERVER_DISPLAY_NAME,
} from './constants.js';

/** Public API surface of `@geoql/doctor-language-server`. */
export const api = {
  createServer,
  startLanguageServer,
  toLspDiagnostic,
  rangeFromLineColumn,
  rangesOverlap,
  toZeroBasedPosition,
  toLspSeverity,
  severityLabel,
  groupDiagnosticsByUri,
  selectProjectKind,
  isAuditableProject,
  diagnosticFileToUri,
  uriToFsPath,
  createScheduler,
  createVersionCache,
  shouldAuditVersion,
  DIAGNOSTIC_SOURCE,
  SERVER_DISPLAY_NAME,
  DOCUMENT_CHANGE_DEBOUNCE_MS,
  INITIAL_WORKSPACE_SCAN_DELAY_MS,
  SCANNABLE_EXTENSIONS,
} as const;

export {
  createServer,
  startLanguageServer,
  createVersionCache,
  shouldAuditVersion,
  type VersionCache,
  createScheduler,
  type CancellationToken,
  type Scheduler,
  type SchedulerOptions,
  groupDiagnosticsByUri,
  type GroupDiagnosticsInput,
  toLspDiagnostic,
  type MapDiagnosticInput,
  rangeFromLineColumn,
  rangesOverlap,
  toZeroBasedPosition,
  severityLabel,
  toLspSeverity,
  isAuditableProject,
  selectProjectKind,
  type DoctorProjectKind,
  diagnosticFileToUri,
  uriToFsPath,
  DIAGNOSTIC_SOURCE,
  DOCUMENT_CHANGE_DEBOUNCE_MS,
  INITIAL_WORKSPACE_SCAN_DELAY_MS,
  SCANNABLE_EXTENSIONS,
  SERVER_DISPLAY_NAME,
};
