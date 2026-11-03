import { narrowReport } from '../narrow-report.js';
import type {
  AuditReport,
  BaselineSummary,
  Diagnostic,
  ScopeMode,
} from '../types.js';
import { compareWithBaseRevision } from './base-snapshot.js';
import { createLinesMatcher } from './match.js';
import {
  isScopeMode,
  ScopeError,
  SCOPE_MODES,
  type ScopePlan,
  type ScopeRequest,
} from './resolve.js';

export interface ScopeFlags {
  readonly scope?: string;
  readonly base?: string;
  readonly full?: boolean;
  readonly diff?: boolean;
  readonly staged?: boolean;
  readonly changedFilesFrom?: string;
  readonly includeUntracked?: boolean;
}

export interface ScopeConfigDefaults {
  readonly scope?: ScopeMode;
  readonly base?: string;
}

/**
 * Translate CLI flags (+ config defaults) into a {@link ScopeRequest}.
 *
 * The deprecated selectors stay exact aliases of `--scope files`:
 * `--diff` = files changed vs HEAD (untracked folded in), `--staged` = files
 * in the index, `--changed-files-from <ref>` = files changed vs `<ref>`
 * (direct diff, no merge-base). `--full` always wins. Conflicting selectors
 * throw {@link ScopeError} (CLI exit 2).
 */
export function scopeRequestFromFlags(
  flags: ScopeFlags,
  config: ScopeConfigDefaults = {},
): ScopeRequest {
  const legacy = [
    flags.diff === true,
    flags.staged === true,
    flags.changedFilesFrom !== undefined,
  ].filter(Boolean).length;
  if (legacy > 1) {
    throw new ScopeError(
      '--diff, --staged, and --changed-files-from are mutually exclusive.',
    );
  }
  if (flags.scope !== undefined && !isScopeMode(flags.scope)) {
    throw new ScopeError(
      `--scope must be one of ${SCOPE_MODES.join(' | ')}, got "${flags.scope}".`,
    );
  }
  if (
    (flags.scope !== undefined || flags.base !== undefined) &&
    (flags.diff === true || flags.changedFilesFrom !== undefined)
  ) {
    throw new ScopeError(
      '--diff / --changed-files-from cannot be combined with --scope or --base; use --scope files --base <ref>.',
    );
  }
  const includeUntracked = flags.includeUntracked === true;
  if (flags.full) return { mode: 'full' };
  if (flags.diff) return { mode: 'files', legacy: 'diff', includeUntracked };
  if (flags.changedFilesFrom !== undefined) {
    return {
      mode: 'files',
      base: flags.changedFilesFrom,
      legacy: 'changed-files-from',
      includeUntracked,
    };
  }
  const mode: ScopeMode =
    (flags.scope as ScopeMode | undefined) ??
    (flags.staged ? 'files' : (config.scope ?? 'full'));
  if (flags.staged && flags.base !== undefined) {
    throw new ScopeError('--staged compares the index to HEAD; drop --base.');
  }
  const base = flags.base ?? config.base;
  return {
    mode,
    ...(flags.staged ? { staged: true } : {}),
    ...(base !== undefined && !flags.staged ? { base } : {}),
    includeUntracked,
  };
}

export interface ScopeGate {
  readonly failOn: 'error' | 'warn' | 'none';
  readonly includeTestFiles?: boolean;
}

export interface ApplyScopeOptions {
  readonly rootDir: string;
  /**
   * Skip the base-revision audit for `changed`: a `--baseline` report
   * replaces the git base as the comparison point.
   */
  readonly skipBaseComparison?: boolean;
  readonly auditBase: (
    snapshotRoot: string,
    files: readonly string[],
  ) => Promise<AuditReport>;
}

export interface ScopedReport {
  /** The input report tagged with `scope`; findings NOT yet narrowed. */
  readonly report: AuditReport;
  /** Filter to apply (after any --baseline) via {@link finishScopedReport}. */
  readonly keep?: (d: Diagnostic) => boolean;
  /** Base-revision delta summary (`changed`). */
  readonly summary?: BaselineSummary;
}

/**
 * Evaluate a resolved scope plan against a report already restricted to the
 * plan's files. Narrowing is returned as a `keep` predicate rather than
 * applied, so multi-project aggregation and `--baseline` can run on the full
 * set of changed-file findings first (the score stays theirs).
 */
export async function applyScopePlan(
  report: AuditReport,
  plan: ScopePlan,
  options: ApplyScopeOptions,
): Promise<ScopedReport> {
  const scoped: AuditReport = {
    ...report,
    scope: { mode: plan.mode, ...(plan.base ? { base: plan.base } : {}) },
  };
  if (plan.mode === 'changed') {
    if (options.skipBaseComparison) return { report: scoped };
    const comparison = await compareWithBaseRevision(scoped, plan, options);
    const fresh = new Set(comparison.newDiagnostics);
    return {
      report: scoped,
      keep: (d) => fresh.has(d),
      summary: comparison.summary,
    };
  }
  if (plan.mode === 'files') return { report: scoped };
  return {
    report: scoped,
    keep: createLinesMatcher(options.rootDir, plan.changes),
  };
}

export interface ScopeParts {
  readonly scopeFiles?: readonly string[];
  readonly keep?: (d: Diagnostic) => boolean;
  readonly summary?: BaselineSummary;
}

/** Combine per-project scope results for a `--project` aggregate run. */
export function mergeScopeParts(parts: readonly ScopeParts[]): ScopeParts {
  const scoped = parts.filter((p) => p.scopeFiles !== undefined);
  if (scoped.length === 0) return {};
  const keeps = scoped.flatMap((p) => (p.keep ? [p.keep] : []));
  const summaries = scoped.flatMap((p) => (p.summary ? [p.summary] : []));
  const sum = (key: 'matchedCount' | 'newCount' | 'fixedCount'): number =>
    summaries.reduce((n, s) => n + s[key], 0);
  return {
    scopeFiles: scoped.flatMap((p) => p.scopeFiles!),
    ...(keeps.length > 0
      ? { keep: (d: Diagnostic) => keeps.some((keep) => keep(d)) }
      : {}),
    ...(summaries.length > 0
      ? {
          summary: {
            file: summaries[0]!.file,
            matchedCount: sum('matchedCount'),
            newCount: sum('newCount'),
            fixedCount: sum('fixedCount'),
          },
        }
      : {}),
  };
}

export interface FinishScopeOptions extends ScopeGate {
  readonly keep?: (d: Diagnostic) => boolean;
  readonly summary?: BaselineSummary;
}

/**
 * Apply a deferred scope filter (and attach the base-revision summary). The
 * score is left as computed over the changed files' full findings.
 */
export function finishScopedReport(
  report: AuditReport,
  options: FinishScopeOptions,
): AuditReport {
  const narrowed = options.keep
    ? narrowReport(report, report.diagnostics.filter(options.keep), options)
    : report;
  return options.summary
    ? { ...narrowed, baseline: options.summary }
    : narrowed;
}
