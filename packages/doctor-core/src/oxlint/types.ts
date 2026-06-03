export interface OxlintRawLabel {
  span: {
    offset: number;
    length: number;
    line?: number;
    column?: number;
  };
  message?: string;
}

export interface OxlintRawDiagnostic {
  filename: string;
  message: string;
  severity: 'error' | 'warning';
  code?: string;
  rule?: string;
  url?: string;
  labels?: OxlintRawLabel[];
  start_line?: number;
  start_column?: number;
  end_line?: number;
  end_column?: number;
}

export interface OxlintRunOptions {
  rootDir: string;
  targetPath: string;
  configPath: string;
  oxlintBin: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
  fix?: boolean;
}

export interface OxlintRunResult {
  diagnostics: OxlintRawDiagnostic[];
  stderr: string;
  exitCode: number | null;
}
