export type Severity = 'error' | 'warning';

export type DiagnosticSource = 'template' | 'oxlint' | 'sfc';

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
}

export interface AuditConfig {
  rootDir?: string;
  include?: string[];
  exclude?: string[];
  rules?: Record<string, Severity | 'off'>;
  failOn?: Severity;
}

export interface AuditReport {
  rootDir: string;
  filesScanned: number;
  diagnostics: Diagnostic[];
  score: number;
  errorCount: number;
  warningCount: number;
  exitCode: 0 | 1 | 2;
}
