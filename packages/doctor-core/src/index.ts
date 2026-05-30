export { audit } from './audit.js';
export { loadAuditConfig } from './config.js';
export { detectProject } from './detect-project.js';
export { agentReport } from './reporters/agent.js';
export { docsUrl } from './reporters/docs-url.js';
export { format, type ReporterFormat } from './reporters/index.js';
export {
  buildDoctorReport,
  DOCTOR_REPORT_SCHEMA_VERSION,
  jsonReport,
  type DoctorReport,
} from './reporters/json.js';
export { jsonCompactReport } from './reporters/json-compact.js';
export { prettyReport } from './reporters/pretty.js';
export type {
  ProjectInfoLite,
  ReporterInput,
  ReporterOptions,
} from './reporters/types.js';
export { scoreDiagnostics } from './score.js';
export type { ScoreBreakdownEntry, ScoreConfig, ScoreResult } from './score.js';
export type {
  Capability,
  Framework,
  MonorepoKind,
  ProjectInfo,
} from './types/project-info.js';
export type {
  AuditConfig,
  AuditReport,
  Diagnostic,
  DiagnosticSource,
  Severity,
} from './types.js';
