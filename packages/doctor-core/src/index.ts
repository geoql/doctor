export { encodeAnnotation, encodeAnnotations } from './annotations.js';
export { audit } from './audit.js';
export { checkBuildQuality } from './check-build-quality.js';
export { checkDeps } from './check-deps.js';
export {
  checkDeadCode,
  dedupeDeadCodeAgainstLint,
  DeadCodeImportFailed,
  DeadCodeTimeoutError,
} from './check-dead-code.js';
export { checkNuxtProject } from './check-nuxt-project.js';
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
export {
  applyInlineDisables,
  parseDirectives,
  type ApplyInlineDisablesOptions,
  type DirectiveLine,
  type DirectiveRange,
  type DirectiveSet,
} from './disables/index.js';
export { listChangedFiles, type GitScopeMode } from './git-scope.js';
export {
  isNuxtLayoutFile,
  isNuxtPageFile,
  isNuxtServerFile,
} from './nuxt/file-role.js';
export { runCrossFilePass } from './nuxt/cross-file/run.js';
export { OxlintOutputTooLarge, OxlintSpawnFailed } from './oxlint/errors.js';
export { agentReport } from './reporters/agent.js';
export { docsUrl } from './reporters/docs-url.js';
export { sarifReport } from './reporters/sarif.js';
export {
  format,
  renderVerboseTrace,
  type ReporterFormat,
  type VerboseTraceOptions,
} from './reporters/index.js';
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
export {
  loadAllRuleDocs,
  loadRuleDoc,
  type LoadRuleDocOptions,
  type RuleDoc,
} from './rule-docs.js';
export {
  listRules,
  RULE_REGISTRY,
  type ListRulesFilter,
  type RegisteredRule,
  type RuleCategory,
  type RuleSource,
} from './rule-registry.js';
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
  AuditTimings,
  Diagnostic,
  DiagnosticSource,
  Severity,
} from './types.js';
