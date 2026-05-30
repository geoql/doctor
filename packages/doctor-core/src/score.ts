import type { Diagnostic } from './types.js';

const SEVERITY_WEIGHTS = { error: 5, warn: 2, info: 0.5 } as const;

export interface ScoreBreakdownEntry {
  ruleId: string;
  occurrences: number;
  weightPerOccurrence: number;
  penalty: number;
}

export interface ScoreResult {
  score: number;
  passed: boolean;
  threshold: number;
  totalFindings: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  breakdown: ScoreBreakdownEntry[];
}

export interface ScoreConfig {
  rules?: Record<string, { weight?: number }>;
  threshold?: number;
}

export function scoreDiagnostics(
  diagnostics: Diagnostic[],
  config?: ScoreConfig,
): ScoreResult {
  const threshold = config?.threshold ?? 0;

  let errorCount = 0;
  let warnCount = 0;
  let infoCount = 0;

  const byRule = new Map<string, Diagnostic[]>();
  for (const d of diagnostics) {
    if (d.severity === 'error') errorCount += 1;
    else if (d.severity === 'warn') warnCount += 1;
    else infoCount += 1;

    const list = byRule.get(d.ruleId);
    if (list) list.push(d);
    else byRule.set(d.ruleId, [d]);
  }

  const sortedRuleIds = [...byRule.keys()].sort();
  const breakdown: ScoreBreakdownEntry[] = [];
  let penalty = 0;

  for (const ruleId of sortedRuleIds) {
    const list = byRule.get(ruleId)!;
    const weight =
      config?.rules?.[ruleId]?.weight ??
      SEVERITY_WEIGHTS[list[0].severity as keyof typeof SEVERITY_WEIGHTS];
    let rulePenalty = 0;
    for (let i = 0; i < list.length; i++) {
      rulePenalty += weight * (i === 0 ? 1 : 1 / Math.sqrt(i + 1));
    }
    penalty += rulePenalty;
    breakdown.push({
      ruleId,
      occurrences: list.length,
      weightPerOccurrence: weight,
      penalty: rulePenalty,
    });
  }

  breakdown.sort((a, b) => b.penalty - a.penalty);

  const score = Math.max(0, Math.round(100 - penalty));

  return {
    score,
    passed: score >= threshold,
    threshold,
    totalFindings: diagnostics.length,
    errorCount,
    warnCount,
    infoCount,
    breakdown,
  };
}
