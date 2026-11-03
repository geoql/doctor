import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Diagnostic } from '../types.js';
import { getRuleDiffScope } from './diff-scope.js';
import type { FileChange } from './git-changes.js';
import {
  addedLineRanges,
  diagnosticRange,
  rangesIntersect,
  type LineRange,
} from './match.js';
import { resolveOwnerRanges } from './owner.js';

/**
 * Head-side lines after which a pure deletion happened (`0` = top of file).
 * A deletion belongs to an owner that spans both sides of the gap.
 */
export function deletionPoints(change: FileChange): number[] {
  return change.hunks.filter((h) => h.newCount === 0).map((h) => h.newStart);
}

/**
 * `--scope contextual`: keep a diagnostic when its own span touches a changed
 * line, OR when its owner — the rule's declared `diffScope` (template
 * element, function, component, file), or explicit `contextRanges` — contains
 * an edit or a deletion. Rules without an owner keep line matching, and an
 * owner that cannot be resolved (parse error, no enclosing node) falls back
 * to line matching too.
 */
export function createContextualMatcher(
  rootDir: string,
  changes: readonly FileChange[],
  readSource: (file: string) => string = (file) => readFileSync(file, 'utf-8'),
): (d: Diagnostic) => boolean {
  const byFile = new Map(
    changes.map((c) => [
      resolve(rootDir, c.path),
      { added: addedLineRanges(c), deletions: deletionPoints(c) },
    ]),
  );
  const sources = new Map<string, string | null>();
  const sourceOf = (file: string): string | null => {
    if (!sources.has(file)) {
      try {
        sources.set(file, readSource(file));
      } catch {
        sources.set(file, null);
      }
    }
    return sources.get(file)!;
  };
  return (d) => {
    const file = resolve(rootDir, d.file);
    const change = byFile.get(file);
    if (!change) return false;
    if (rangesIntersect([diagnosticRange(d)], change.added)) return true;
    let owned: LineRange[] | null = null;
    if (d.contextRanges) {
      owned = d.contextRanges.map((r) => [r.line, Math.max(r.line, r.endLine)]);
    } else {
      const scope = getRuleDiffScope(d.ruleId);
      const source = scope === 'line' ? null : sourceOf(file);
      if (scope !== 'line' && source !== null) {
        owned = resolveOwnerRanges(file, source, d, scope);
      }
    }
    if (!owned) return false;
    const ranges = owned;
    return (
      rangesIntersect(ranges, change.added) ||
      change.deletions.some((p) => ranges.some(([s, e]) => s <= p && p < e))
    );
  };
}
