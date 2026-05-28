import type { Diagnostic } from './types.js';

const ERROR_PENALTY = 10;
const WARNING_PENALTY = 2;

export interface ScoreBreakdown {
  score: number;
  errorCount: number;
  warningCount: number;
}

export function scoreDiagnostics(diagnostics: Diagnostic[]): ScoreBreakdown {
  let errorCount = 0;
  let warningCount = 0;
  for (const d of diagnostics) {
    if (d.severity === 'error') errorCount += 1;
    else warningCount += 1;
  }
  const penalty = errorCount * ERROR_PENALTY + warningCount * WARNING_PENALTY;
  const score = Math.max(0, 100 - penalty);
  return { score, errorCount, warningCount };
}
