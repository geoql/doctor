import type { Severity } from '../types.js';

export interface DepsIssue {
  ruleId: string;
  file: string;
  line: number;
  column: number;
  severity: Severity;
  message: string;
  recommendation: string;
  versions: string[];
}
