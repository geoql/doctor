import type { ScoreResult } from './score.js';
import type { ProjectInfoLite } from './reporters/types.js';
import type { ProjectInfo } from './types/project-info.js';

export type Severity = 'error' | 'warn' | 'info';

export type DiagnosticSource =
  | 'template'
  | 'oxlint'
  | 'sfc'
  | 'dead-code'
  | 'project'
  | 'deps';

export interface Diagnostic {
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  ruleId: string;
  severity: Severity;
  message: string;
  source: DiagnosticSource;
  recommendation?: string;
  codeSnippet?: string;
  /** Present only for test/story/fixture files; omitted for prod source. */
  surface?: 'test';
  /**
   * Stable identity (rule + relative path + normalized source evidence, no
   * line numbers) used to match findings against a `--baseline` report.
   */
  fingerprint?: string;
  /**
   * INTERNAL ownership ranges for `--scope contextual` (react.doctor's
   * `contextNodes`): when set they override the rule's `diffScope`, and the
   * finding is reported if any range intersects the change. Never written to
   * JSON, SARIF, or push payloads.
   */
  contextRanges?: ReadonlyArray<{ line: number; endLine: number }>;
}

/** Result of comparing a scan against a saved baseline (or base revision). */
export interface BaselineSummary {
  /** The baseline report file, or `git:<ref>` for a base-revision comparison. */
  file: string;
  /** Current findings that already existed in the baseline. */
  matchedCount: number;
  /** Current findings that are new relative to the baseline. */
  newCount: number;
  /** Baseline findings that no longer occur. */
  fixedCount: number;
}

export interface AuditConfig {
  rootDir?: string;
  include?: string[];
  exclude?: string[];
  rules?: Record<string, Severity | 'off'>;
  failOn?: 'error' | 'warn' | 'none';
  deadCode?: boolean;
  lint?: boolean;
  threshold?: number;
  scopeFiles?: string[];
  respectInlineDisables?: boolean;
  fix?: boolean;
  fixExcludes?: string[];
  maxDurationMs?: number;
  includeTestFiles?: boolean;
  /**
   * Reuse already-detected project info instead of detecting it from
   * `rootDir` (a base-revision snapshot has no installed dependencies).
   */
  projectInfo?: ProjectInfo;
}

/** How much of a change set a scan reports. */
export type ScopeMode = 'full' | 'files' | 'changed' | 'lines' | 'contextual';

export interface ReportScope {
  mode: ScopeMode;
  /** The ref the change set was computed against (absent for --staged). */
  base?: string;
}

export interface SkippedCheckReason {
  kind: 'time-budget-exhausted';
  deadlineMs: number;
  elapsedMs: number;
  skippedPasses: readonly string[];
}

export interface AuditTimings {
  template: number;
  sfc: number;
  script: number;
  deadCode: number;
  total: number;
}

export interface AuditReport {
  rootDir: string;
  filesScanned: number;
  diagnostics: Diagnostic[];
  score: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  exitCode: 0 | 1 | 2;
  scoreResult: ScoreResult;
  projectInfo: ProjectInfoLite;
  elapsedMs: number;
  timings: AuditTimings;
  ruleCounts: Record<string, number>;
  incomplete: boolean;
  skippedCheckReasons?: readonly SkippedCheckReason[];
  /**
   * Severity counts the `--fail-on` gate saw, when config `surfaces.ciGate`
   * made them differ from the scored counts. Absent otherwise.
   */
  gate?: { errorCount: number; warnCount: number };
  /** `git rev-parse HEAD` of the scanned tree, when it is a git checkout. */
  sourceRevision?: string;
  /** Hash of the finding-affecting settings (see `computeConfigHash`). */
  configHash?: string;
  /** Present when findings were narrowed to the new ones vs a baseline. */
  baseline?: BaselineSummary;
  /** Present for every scope other than `full`. */
  scope?: ReportScope;
}
