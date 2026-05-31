import type { Severity } from '../../types.js';

export interface NuxtPostCheckIssue {
  ruleId: string;
  file: string;
  line: number;
  column: number;
  severity: Severity;
  message: string;
  recommendation: string;
}
