export { encodeAnnotation, encodeAnnotations } from './annotations.js';
export { audit } from './audit.js';
export {
  checkDeadCode,
  dedupeDeadCodeAgainstLint,
  DeadCodeImportFailed,
  DeadCodeTimeoutError,
} from './check-dead-code.js';
export {
  BUILT_IN_RECOMMENDED,
  ConfigCycleError,
  ConfigFileNotFoundError,
  InvalidConfigError,
  defineConfig,
  loadDoctorConfig,
  mergeCliOverrides,
  validateConfig,
} from './config/index.js';
export type {
  CliOverrides,
  ConfigSource,
  DoctorUserConfig,
  ResolvedDoctorConfig,
} from './config/index.js';
export { detectProject } from './detect-project.js';
export { listChangedFiles, type GitScopeMode } from './git-scope.js';
export { OxlintOutputTooLarge, OxlintSpawnFailed } from './oxlint/errors.js';
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
