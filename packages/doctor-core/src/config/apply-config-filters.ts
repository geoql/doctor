import { matchesGlob, relative, resolve, sep } from 'node:path';
import { RULE_REGISTRY } from '../rule-registry.js';
import { scoreDiagnostics } from '../score.js';
import type { AuditReport, Diagnostic } from '../types.js';
import type {
  DoctorIgnoreConfig,
  DoctorSurface,
  DoctorSurfacesConfig,
  SurfaceControls,
} from './types.js';

export interface ApplyConfigFiltersOptions {
  readonly ignore?: DoctorIgnoreConfig;
  readonly surfaces?: DoctorSurfacesConfig;
  readonly failOn: 'error' | 'warn' | 'none';
  readonly includeTestFiles?: boolean;
  /** Which surface the printed report is for. Default `cli`. */
  readonly outputSurface?: 'cli' | 'prComment';
}

interface RuleIdentity {
  readonly category: string | undefined;
  readonly tags: readonly string[];
}

const IDENTITY = new Map<string, RuleIdentity>(
  RULE_REGISTRY.map((rule) => [
    rule.id,
    { category: rule.category, tags: rule.tags },
  ]),
);
const UNKNOWN_IDENTITY: RuleIdentity = { category: undefined, tags: [] };

function relPath(rootDir: string, file: string): string {
  return relative(rootDir, resolve(rootDir, file)).split(sep).join('/');
}

function matchesAny(path: string, globs: readonly string[]): boolean {
  return globs.some((glob) => matchesGlob(path, glob));
}

function isIgnored(
  diagnostic: Diagnostic,
  rootDir: string,
  ignore: DoctorIgnoreConfig,
): boolean {
  if (ignore.rules?.includes(diagnostic.ruleId)) return true;
  const path = relPath(rootDir, diagnostic.file);
  if (ignore.files && matchesAny(path, ignore.files)) return true;
  return (ignore.overrides ?? []).some(
    (override) =>
      matchesAny(path, override.files) &&
      (override.rules === undefined ||
        override.rules.length === 0 ||
        override.rules.includes(diagnostic.ruleId)),
  );
}

/**
 * react.doctor `isDiagnosticOnSurface`: includes (rule, category, tag) win
 * over excludes. Unlike react.doctor there are no built-in default
 * exclusions \u2014 an unconfigured surface shows everything, so the score
 * stays identical for configs that never mention `surfaces`.
 */
export function isDiagnosticOnSurface(
  diagnostic: Diagnostic,
  controls: SurfaceControls | undefined,
): boolean {
  if (!controls) return true;
  const { category, tags } =
    IDENTITY.get(diagnostic.ruleId) ?? UNKNOWN_IDENTITY;
  const has = (values: readonly string[] | undefined, value?: string) =>
    value !== undefined && (values ?? []).includes(value);
  const hasTag = (values: readonly string[] | undefined) =>
    tags.some((tag) => (values ?? []).includes(tag));

  if (has(controls.includeRules, diagnostic.ruleId)) return true;
  if (has(controls.includeCategories, category)) return true;
  if (hasTag(controls.includeTags)) return true;
  if (has(controls.excludeRules, diagnostic.ruleId)) return false;
  if (has(controls.excludeCategories, category)) return false;
  if (hasTag(controls.excludeTags)) return false;
  return true;
}

function onSurface(
  diagnostics: readonly Diagnostic[],
  surfaces: DoctorSurfacesConfig | undefined,
  surface: DoctorSurface,
): Diagnostic[] {
  const controls = surfaces?.[surface];
  return diagnostics.filter((d) => isDiagnosticOnSurface(d, controls));
}

/**
 * Apply the config `ignore` and `surfaces` controls to an already
 * rule-filtered report (see `filterReportByRules`).
 *
 * - `ignore.rules` / `ignore.files` / `ignore.overrides` drop findings
 *   from every surface.
 * - `surfaces.cli` (or `prComment` for the PR-comment body) decides which
 *   findings the report lists; `surfaces.score` which ones count toward the
 *   score and the severity counts; `surfaces.ciGate` which ones the
 *   `--fail-on` gate sees (exposed as `report.gate`).
 *
 * Test/story findings stay out of the score and gate unless
 * `includeTestFiles` is set, matching `audit()`. A crashed-pass exit 2 is
 * preserved. With neither `ignore` nor `surfaces` configured the report is
 * returned unchanged.
 */
export function applyConfigFilters(
  report: AuditReport,
  options: ApplyConfigFiltersOptions,
): AuditReport {
  const { ignore, surfaces } = options;
  if (!ignore && !surfaces) return report;

  const kept = ignore
    ? report.diagnostics.filter((d) => !isIgnored(d, report.rootDir, ignore))
    : report.diagnostics;
  const shown = onSurface(kept, surfaces, options.outputSurface ?? 'cli');
  const production = options.includeTestFiles
    ? kept
    : kept.filter((d) => d.surface !== 'test');
  const scored = onSurface(production, surfaces, 'score');
  const gated = onSurface(production, surfaces, 'ciGate');

  const scoreResult = scoreDiagnostics(scored, {
    threshold: report.scoreResult.threshold,
  });
  const gateErrors = gated.filter((d) => d.severity === 'error').length;
  const gateWarns = gated.filter((d) => d.severity === 'warn').length;

  let exitCode: 0 | 1 | 2 = report.exitCode;
  if (exitCode !== 2) {
    const tripping =
      options.failOn === 'none'
        ? 0
        : options.failOn === 'warn'
          ? gateErrors + gateWarns
          : gateErrors;
    exitCode = tripping > 0 ? 1 : 0;
  }

  const ruleCounts: Record<string, number> = {};
  for (const d of shown) ruleCounts[d.ruleId] = (ruleCounts[d.ruleId] ?? 0) + 1;

  return {
    ...report,
    diagnostics: shown,
    score: scoreResult.score,
    errorCount: scoreResult.errorCount,
    warnCount: scoreResult.warnCount,
    infoCount: scoreResult.infoCount,
    scoreResult,
    ruleCounts,
    exitCode,
    gate: { errorCount: gateErrors, warnCount: gateWarns },
  };
}
