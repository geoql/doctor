import { resolve } from 'node:path';
import type { Diagnostic } from '../types.js';
import type { FileChange } from './git-changes.js';

/** Inclusive 1-based line interval. */
export type LineRange = readonly [start: number, end: number];

/** Head-side line ranges a change added or rewrote (pure deletions excluded). */
export function addedLineRanges(change: FileChange): LineRange[] {
  return change.hunks
    .filter((h) => h.newCount > 0)
    .map((h) => [h.newStart, h.newStart + h.newCount - 1] as const);
}

export function rangesIntersect(
  a: readonly LineRange[],
  b: readonly LineRange[],
): boolean {
  return a.some(([aStart, aEnd]) =>
    b.some(([bStart, bEnd]) => aStart <= bEnd && bStart <= aEnd),
  );
}

/** A diagnostic's own source span as a line range. */
export function diagnosticRange(d: Diagnostic): LineRange {
  return [d.line, Math.max(d.line, d.endLine ?? d.line)];
}

/**
 * `--scope lines`: keep a diagnostic only when its source span touches a
 * changed line. Line numbers are head-side, so renames and shifted code are
 * handled by git's own hunk math.
 */
export function createLinesMatcher(
  rootDir: string,
  changes: readonly FileChange[],
): (d: Diagnostic) => boolean {
  const byFile = new Map(
    changes.map((c) => [resolve(rootDir, c.path), addedLineRanges(c)]),
  );
  return (d) => {
    const ranges = byFile.get(resolve(rootDir, d.file));
    return (
      ranges !== undefined && rangesIntersect([diagnosticRange(d)], ranges)
    );
  };
}
