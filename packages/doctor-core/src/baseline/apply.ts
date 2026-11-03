import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { narrowReport } from '../narrow-report.js';
import {
  mapLineThroughHunks,
  readChangeSet,
  type Hunk,
} from '../scope/git-changes.js';
import type { AuditReport } from '../types.js';
import { computeDiagnosticDelta, type DeltaDiagnostic } from './delta.js';

export class BaselineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BaselineError';
  }
}

const BaselineDiagnosticSchema = z
  .object({
    file: z.string(),
    line: z.number(),
    ruleId: z.string(),
    message: z.string(),
    fingerprint: z.string().optional(),
  })
  .loose();

const BaselineReportSchema = z
  .object({
    schemaVersion: z.literal('1'),
    diagnostics: z.array(BaselineDiagnosticSchema),
    configHash: z.string().optional(),
    sourceRevision: z.string().optional(),
    baseline: z.unknown().optional(),
    incomplete: z.boolean().optional(),
    scope: z.object({ mode: z.string() }).loose().optional(),
  })
  .loose();

export type BaselineReport = z.infer<typeof BaselineReportSchema>;

/**
 * Read and validate a saved `--json` report for use as a baseline. Only a
 * complete, full-scope, non-comparison report from a version that records
 * fingerprints and a config hash is accepted — anything else would make
 * pre-existing findings look new (or hide new ones).
 */
export function readBaselineReport(file: string): BaselineReport {
  const fail = (reason: string): never => {
    throw new BaselineError(`Cannot use baseline report "${file}": ${reason}`);
  };
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, 'utf-8'));
  } catch (err) {
    // readFileSync / JSON.parse only ever throw Error instances.
    return fail((err as Error).message);
  }
  const parsed = BaselineReportSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      'not a doctor --json report (schemaVersion "1" with diagnostics expected).',
    );
  }
  const report = parsed.data;
  if (report.baseline !== undefined) {
    fail(
      'it is itself a baseline comparison; save a plain --json report instead.',
    );
  }
  if (report.incomplete === true) {
    fail('the report is incomplete (time budget exhausted); re-run the scan.');
  }
  if (report.scope !== undefined && report.scope.mode !== 'full') {
    fail(
      `it was produced with --scope ${report.scope.mode}; a baseline must be a full scan.`,
    );
  }
  if (
    report.configHash === undefined ||
    report.diagnostics.some((d) => d.fingerprint === undefined)
  ) {
    fail(
      'it predates diagnostic fingerprints; regenerate it with the current version (--json).',
    );
  }
  return report;
}

export interface ApplyBaselineOptions {
  /** Path as given on the CLI (echoed in the summary). */
  readonly baselineFile: string;
  readonly failOn: 'error' | 'warn' | 'none';
  readonly includeTestFiles?: boolean;
  /**
   * Absolute head paths a `--scope` run covered. Baseline findings outside
   * them are ignored instead of being counted as fixed.
   */
  readonly scopeFiles?: ReadonlySet<string>;
}

interface GitContext {
  readonly renamedFiles: Map<string, string>;
  readonly hunksByBaseFile: Map<string, readonly Hunk[]>;
}

async function readGitContext(
  rootDir: string,
  revision: string,
): Promise<GitContext> {
  const renamedFiles = new Map<string, string>();
  const hunksByBaseFile = new Map<string, readonly Hunk[]>();
  try {
    const changes = await readChangeSet({
      rootDir,
      ref: revision,
      includeUntracked: true,
    });
    for (const change of changes) {
      if (change.oldPath === null) continue;
      const oldAbs = resolve(rootDir, change.oldPath);
      if (change.status === 'renamed') {
        renamedFiles.set(oldAbs, resolve(rootDir, change.path));
      }
      hunksByBaseFile.set(oldAbs, change.hunks);
    }
  } catch {
    // revision unknown here (shallow clone, other repo): match without git help
  }
  return { renamedFiles, hunksByBaseFile };
}

/**
 * Narrow `report` to findings that are NEW relative to a saved baseline
 * report. The score is untouched (computed on all current findings); the
 * gate, severity counts, and displayed diagnostics cover new findings only,
 * and `report.baseline` records matched / new / fixed counts.
 */
export async function applyBaseline(
  report: AuditReport,
  options: ApplyBaselineOptions,
): Promise<AuditReport> {
  const baseline = readBaselineReport(
    resolve(process.cwd(), options.baselineFile),
  );
  if (report.configHash !== baseline.configHash) {
    throw new BaselineError(
      `Cannot use baseline report "${options.baselineFile}": it was produced with different finding-affecting settings (rules, preset, category/dimension filters, include/exclude, inline-disable handling, or enabled passes). Regenerate it with the current settings.`,
    );
  }
  const base: DeltaDiagnostic[] = baseline.diagnostics.map((d) => ({
    file: resolve(report.rootDir, d.file),
    line: d.line,
    ruleId: d.ruleId,
    message: d.message,
    fingerprint: d.fingerprint,
  }));
  const git = baseline.sourceRevision
    ? await readGitContext(report.rootDir, baseline.sourceRevision)
    : undefined;
  const scopeFiles = options.scopeFiles;
  const inScope = scopeFiles
    ? base.filter((d) =>
        scopeFiles.has(git?.renamedFiles.get(d.file) ?? d.file),
      )
    : base;
  const delta = computeDiagnosticDelta({
    head: report.diagnostics,
    base: inScope,
    ...(git
      ? {
          renamedFiles: git.renamedFiles,
          mapBaseLine: (file: string, line: number) => {
            const hunks = git.hunksByBaseFile.get(file);
            return hunks ? mapLineThroughHunks(hunks, line) : line;
          },
        }
      : {}),
  });
  return {
    ...narrowReport(report, delta.newDiagnostics, options),
    baseline: {
      file: options.baselineFile,
      matchedCount: delta.matchedCount,
      newCount: delta.newDiagnostics.length,
      fixedCount: delta.fixedCount,
    },
  };
}
