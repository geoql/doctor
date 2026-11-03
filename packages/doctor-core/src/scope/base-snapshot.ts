import { execFile } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import { computeDiagnosticDelta } from '../baseline/delta.js';
import type { AuditReport, BaselineSummary, Diagnostic } from '../types.js';
import { mapLineThroughHunks, type Hunk } from './git-changes.js';
import type { ScopePlan } from './resolve.js';

const execFileAsync = promisify(execFile);

export interface BaseSnapshot {
  /** Temp directory mirroring the base revision of the changed files. */
  readonly root: string;
  /** Absolute snapshot paths that were materialized. */
  readonly files: readonly string[];
  readonly cleanup: () => void;
}

/**
 * Write the base-revision content of every changed file that existed at
 * `plan.diffBase` into a temp tree at the same relative paths (renamed files
 * at their OLD path). Added files have no base side and are skipped.
 */
export async function materializeBaseSnapshot(
  rootDir: string,
  plan: ScopePlan,
): Promise<BaseSnapshot> {
  const root = mkdtempSync(join(tmpdir(), 'doctor-base-'));
  const files: string[] = [];
  for (const change of plan.changes) {
    if (change.oldPath === null) continue;
    const { stdout } = await execFileAsync(
      'git',
      ['show', `${plan.diffBase}:./${change.oldPath}`],
      { cwd: rootDir, encoding: 'buffer', maxBuffer: 256 * 1024 * 1024 },
    );
    const target = resolve(root, change.oldPath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, stdout);
    files.push(target);
  }
  return {
    root,
    files,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

export interface CompareWithBaseOptions {
  readonly rootDir: string;
  /**
   * Audit the snapshot with the SAME settings as the head run (rules,
   * filters, include/exclude), scoped to `files`, dead-code off.
   */
  readonly auditBase: (
    snapshotRoot: string,
    files: readonly string[],
  ) => Promise<AuditReport>;
}

export interface BaseComparison {
  /** The head diagnostics this change introduced. */
  readonly newDiagnostics: readonly Diagnostic[];
  readonly summary: BaselineSummary;
}

/**
 * `--scope changed`: find the findings this change introduced by auditing
 * the base revision of the changed files and running the same count-based
 * delta as `--baseline`.
 */
export async function compareWithBaseRevision(
  report: AuditReport,
  plan: ScopePlan,
  options: CompareWithBaseOptions,
): Promise<BaseComparison> {
  const snapshot = await materializeBaseSnapshot(options.rootDir, plan);
  try {
    const baseReport =
      snapshot.files.length > 0
        ? await options.auditBase(snapshot.root, snapshot.files)
        : undefined;
    const inSnapshot = new Set(snapshot.files);
    const renamedFiles = new Map<string, string>();
    const hunksByBaseFile = new Map<string, readonly Hunk[]>();
    for (const change of plan.changes) {
      if (change.oldPath === null) continue;
      const oldAbs = resolve(options.rootDir, change.oldPath);
      hunksByBaseFile.set(oldAbs, change.hunks);
      if (change.status === 'renamed') {
        renamedFiles.set(oldAbs, resolve(options.rootDir, change.path));
      }
    }
    const base = (baseReport?.diagnostics ?? [])
      .filter((d) => inSnapshot.has(d.file))
      .map((d) => ({
        ...d,
        file: resolve(options.rootDir, relative(snapshot.root, d.file)),
      }));
    const delta = computeDiagnosticDelta({
      head: report.diagnostics,
      base,
      renamedFiles,
      mapBaseLine: (file, line) =>
        mapLineThroughHunks(hunksByBaseFile.get(file)!, line),
    });
    return {
      newDiagnostics: delta.newDiagnostics,
      summary: {
        file: `git:${plan.base ?? 'HEAD'}`,
        matchedCount: delta.matchedCount,
        newCount: delta.newDiagnostics.length,
        fixedCount: delta.fixedCount,
      },
    };
  } finally {
    snapshot.cleanup();
  }
}
