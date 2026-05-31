import type { ScoreResult } from './score.js';
import type { ProjectInfoLite } from './reporters/types.js';

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
}

export interface AuditConfig {
  rootDir?: string;
  include?: string[];
  exclude?: string[];
  rules?: Record<string, Severity | 'off'>;
  failOn?: 'error' | 'warn';
  deadCode?: boolean;
  lint?: boolean;
  threshold?: number;
  scopeFiles?: string[];
  respectInlineDisables?: boolean;
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
}
