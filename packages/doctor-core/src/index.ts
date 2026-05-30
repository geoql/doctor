export { audit } from './audit.js';
export { loadAuditConfig } from './config.js';
export { detectProject } from './detect-project.js';
export { format, type ReporterFormat } from './reporters/index.js';
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
