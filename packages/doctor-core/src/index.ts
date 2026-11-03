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
  applyConfigFilters,
  BUILT_IN_RECOMMENDED,
  ConfigCycleError,
  ConfigFileNotFoundError,
  defaultRuleLevel,
  InvalidConfigError,
  buildJsonSchema,
  defineConfig,
  DoctorUserConfigSchema,
  IgnoreOverrideSchema,
  IgnoreSchema,
  isDiagnosticOnSurface,
  isRuleLevel,
  LevelSchema,
  loadDoctorConfig,
  mergeCliOverrides,
  RuleEntrySchema,
  setRuleLevel,
  SurfaceControlsSchema,
  SurfacesSchema,
  upsertRuleInSource,
  validateConfig,
} from './config/index.js';
export type {
  ApplyConfigFiltersOptions,
  CliOverrides,
  ConfigSource,
  DoctorIgnoreConfig,
  DoctorSurface,
  DoctorSurfacesConfig,
  DoctorUserConfig,
  DoctorUserConfigInput,
  ResolvedDoctorConfig,
  RuleLevel,
  SetRuleLevelOptions,
  SetRuleLevelResult,
  SurfaceControls,
} from './config/index.js';
export { detectProject } from './detect-project.js';
export {
  detectSummary,
  normalizeInitAnswers,
  parseExcludeList,
  planInit,
  renderDetectSummary,
  type InitConfigFormat,
  type InitFileWrite,
  type InitOptions,
  type InitPlan,
  type InitPreset,
  type RawInitAnswers,
  type ResolvedInitAnswers,
} from './init/index.js';
export { detectCiProvider, type CiProvider } from './ci/provider-detect.js';
export {
  scaffoldCiWorkflow,
  type CiScaffoldOptions,
  type CiScaffoldPlan,
} from './ci/scaffold-workflow.js';
export {
  findMonorepoRoot,
  type MonorepoResult,
} from './project-info/find-monorepo-root.js';
export {
  applyInlineDisables,
  parseDirectives,
  type ApplyInlineDisablesOptions,
  type DirectiveLine,
  type DirectiveRange,
  type DirectiveSet,
} from './disables/index.js';
export { listChangedFiles, type GitScopeMode } from './git-scope.js';
export { findGitRoot, gitEnv } from './git-env.js';
export {
  MAX_WARNING_EXIT_CODE,
  MIN_WARNING_EXIT_CODE,
  parseWarningExitCode,
  resolveExitCode,
  type ResolveExitCodeOptions,
} from './exit-code.js';
export {
  resolvePositionalScanInput,
  type PositionalScanInput,
} from './positional-input.js';
export {
  findNestedWorkspaceExclusion,
  type NestedWorkspaceExclusion,
} from './project-info/nested-workspace-projects.js';
export {
  listWorkspacePackages,
  type WorkspacePackage,
} from './project-info/list-workspace-packages.js';
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
export { prCommentReport } from './reporters/pr-comment.js';
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
export { renderAgentPlaybook, renderRulePrompt } from './rule-prompt.js';
export {
  deriveRuleTags,
  listRules,
  RULE_REGISTRY,
  RULE_TAGS,
  type ListRulesFilter,
  type RegisteredRule,
  type RuleCategory,
  type RuleDefinition,
  type RuleSource,
  type RuleTag,
} from './rule-registry.js';
export { scoreDiagnostics } from './score.js';
export { filterReportByRules } from './audit-filter.js';
export type {
  DimensionScore,
  ScoreBreakdownEntry,
  ScoreConfig,
  ScoreResult,
} from './score.js';
export {
  SCORE_DIMENSIONS,
  categoriesForDimension,
  dimensionForCategory,
  isScoreDimension,
} from './score-dimensions.js';
export type { ScoreDimension } from './score-dimensions.js';
export {
  filterRuleIdsByCategory,
  resolveCategoryScope,
} from './config/category-filter.js';
export {
  buildPushPayload,
  pushFindings,
  stripFindings,
  type PushOptions,
  type PushPayload,
  type PushPayloadInput,
  type PushResult,
  type PushedFinding,
} from './push.js';
export type {
  Capability,
  Framework,
  MonorepoKind,
  ProjectInfo,
} from './types/project-info.js';
export {
  applyBaseline,
  BaselineError,
  readBaselineReport,
  type ApplyBaselineOptions,
  type BaselineReport,
} from './baseline/apply.js';
export {
  combineConfigHashes,
  computeConfigHash,
  type ConfigHashInput,
} from './baseline/config-hash.js';
export {
  computeDiagnosticDelta,
  type DeltaDiagnostic,
  type DiagnosticDelta,
  type DiagnosticDeltaInput,
} from './baseline/delta.js';
export {
  attachFingerprints,
  diagnosticEvidence,
  fingerprintDiagnostic,
} from './baseline/fingerprint.js';
export { narrowReport, type NarrowReportOptions } from './narrow-report.js';
export {
  mapLineThroughHunks,
  parseUnifiedDiff,
  readChangeSet,
  readSourceRevision,
  type ChangeSetOptions,
  type FileChange,
  type Hunk,
} from './scope/git-changes.js';
export type {
  AuditConfig,
  AuditReport,
  AuditTimings,
  BaselineSummary,
  Diagnostic,
  DiagnosticSource,
  Severity,
  SkippedCheckReason,
} from './types.js';
