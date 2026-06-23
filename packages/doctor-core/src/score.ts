import { RULE_REGISTRY } from './rule-registry.js';
import {
  SCORE_DIMENSIONS,
  type ScoreDimension,
  dimensionForCategory,
} from './score-dimensions.js';
import type { Diagnostic } from './types.js';

const SEVERITY_WEIGHTS = { error: 5, warn: 2, info: 0.5 } as const;

export interface ScoreBreakdownEntry {
  ruleId: string;
  occurrences: number;
  weightPerOccurrence: number;
  penalty: number;
}

export interface DimensionScore {
  score: number;
  totalFindings: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
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
  /**
   * Per-dimension sub-scores. Each is computed with the SAME √-decay formula
   * isolated to that dimension's diagnostics — diagnostic aids that do NOT sum
   * to the overall score. The single `score` above stays the authoritative value.
   */
  byDimension: Readonly<Record<ScoreDimension, DimensionScore>>;
}

export interface ScoreConfig {
  rules?: Record<string, { weight?: number }>;
  threshold?: number;
}

const DIMENSION_BY_RULE_ID: ReadonlyMap<string, ScoreDimension> = new Map(
  RULE_REGISTRY.map((r) => [r.id, dimensionForCategory(r.category)]),
);

function weightFor(diag: Diagnostic, config: ScoreConfig | undefined): number {
  return (
    config?.rules?.[diag.ruleId]?.weight ??
    SEVERITY_WEIGHTS[diag.severity as keyof typeof SEVERITY_WEIGHTS]
  );
}

function penaltyForGroups(
  byRule: Map<string, Diagnostic[]>,
  config: ScoreConfig | undefined,
): number {
  let penalty = 0;
  for (const list of byRule.values()) {
    const weight = weightFor(list[0]!, config);
    for (let i = 0; i < list.length; i++) {
      penalty += weight * (i === 0 ? 1 : 1 / Math.sqrt(i + 1));
    }
  }
  return penalty;
}

function emptyDimensionScores(): Record<ScoreDimension, DimensionScore> {
  const out = {} as Record<ScoreDimension, DimensionScore>;
  for (const dim of SCORE_DIMENSIONS) {
    out[dim] = {
      score: 100,
      totalFindings: 0,
      errorCount: 0,
      warnCount: 0,
      infoCount: 0,
    };
  }
  return out;
}

function computeByDimension(
  diagnostics: Diagnostic[],
  config: ScoreConfig | undefined,
): Record<ScoreDimension, DimensionScore> {
  const grouped = new Map<ScoreDimension, Map<string, Diagnostic[]>>();
  const counts = emptyDimensionScores();
  for (const d of diagnostics) {
    const dim = DIMENSION_BY_RULE_ID.get(d.ruleId);
    if (dim === undefined) continue;
    const bucket = counts[dim];
    bucket.totalFindings += 1;
    if (d.severity === 'error') bucket.errorCount += 1;
    else if (d.severity === 'warn') bucket.warnCount += 1;
    else bucket.infoCount += 1;
    let byRule = grouped.get(dim);
    if (!byRule) {
      byRule = new Map();
      grouped.set(dim, byRule);
    }
    const list = byRule.get(d.ruleId);
    if (list) list.push(d);
    else byRule.set(d.ruleId, [d]);
  }
  for (const [dim, byRule] of grouped) {
    const penalty = penaltyForGroups(byRule, config);
    counts[dim].score = Math.max(0, Math.round(100 - penalty));
  }
  return counts;
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
    byDimension: computeByDimension(diagnostics, config),
  };
}
