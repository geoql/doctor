/** The fields the delta matcher reads from a head or base diagnostic. */
export interface DeltaDiagnostic {
  readonly file: string;
  readonly line: number;
  readonly ruleId: string;
  readonly message: string;
  readonly fingerprint?: string;
}

export interface DiagnosticDeltaInput<H extends DeltaDiagnostic> {
  readonly head: readonly H[];
  readonly base: readonly DeltaDiagnostic[];
  /** base file → head file, for files renamed between the two revisions. */
  readonly renamedFiles?: ReadonlyMap<string, string>;
  /** Maps a base line onto the head revision (git line-shift). */
  readonly mapBaseLine?: (baseFile: string, line: number) => number;
}

export interface DiagnosticDelta<H> {
  readonly newDiagnostics: H[];
  readonly matchedCount: number;
  readonly fixedCount: number;
}

interface Candidate {
  readonly index: number;
  readonly fingerprint: string | null;
  readonly message: string;
  readonly words: ReadonlySet<string>;
  readonly line: number;
}

function toCandidate(
  d: DeltaDiagnostic,
  index: number,
  line: number,
): Candidate {
  return {
    index,
    fingerprint: d.fingerprint ?? null,
    message: d.message,
    words: new Set(d.message.toLowerCase().match(/\w+/g) ?? []),
    line,
  };
}

/**
 * Jaccard word overlap. Only reached for leftovers, which never share an
 * exact message (the message pass already paired those).
 */
function similarity(head: Candidate, base: Candidate): number {
  let shared = 0;
  for (const word of head.words) if (base.words.has(word)) shared += 1;
  return shared / Math.max(1, head.words.size + base.words.size - shared);
}

type MatchKind = 'exact' | 'fingerprint' | 'message';

function keyFor(kind: MatchKind, c: Candidate): string | null {
  if (kind === 'message') return c.message;
  if (c.fingerprint === null) return null;
  return kind === 'fingerprint'
    ? c.fingerprint
    : JSON.stringify([c.fingerprint, c.message]);
}

/**
 * Count-based delta between a head scan and a base scan.
 *
 * Diagnostics are grouped by (file, ruleId), following renames. A group whose
 * head count does not exceed its base count reports nothing new — formatting
 * churn and moved code never surface as regressions. Only a group whose count
 * grew reports exactly `head − base` new findings; which ones is decided by
 * fingerprint + message, then fingerprint, then message (closest line wins),
 * and finally by message similarity / line distance.
 */
export function computeDiagnosticDelta<H extends DeltaDiagnostic>(
  input: DiagnosticDeltaInput<H>,
): DiagnosticDelta<H> {
  const groups = new Map<string, { head: number[]; base: number[] }>();
  const groupOf = (key: string): { head: number[]; base: number[] } => {
    let group = groups.get(key);
    if (!group) {
      group = { head: [], base: [] };
      groups.set(key, group);
    }
    return group;
  };
  input.base.forEach((d, i) => {
    const file = input.renamedFiles?.get(d.file) ?? d.file;
    groupOf(`${file}\0${d.ruleId}`).base.push(i);
  });
  input.head.forEach((d, i) => {
    groupOf(`${d.file}\0${d.ruleId}`).head.push(i);
  });

  const newIndexes = new Set<number>();
  let fixedCount = 0;
  let matchedCount = 0;
  for (const group of groups.values()) {
    const matched = Math.min(group.head.length, group.base.length);
    matchedCount += matched;
    fixedCount += group.base.length - matched;
    if (group.head.length <= group.base.length) continue;
    if (group.base.length === 0) {
      for (const i of group.head) newIndexes.add(i);
      continue;
    }

    const unmatchedHeads = new Map(
      group.head.map((i) => [
        i,
        toCandidate(input.head[i]!, i, input.head[i]!.line),
      ]),
    );
    const unmatchedBases = new Set(
      group.base
        .map((i) => {
          const d = input.base[i]!;
          return toCandidate(
            d,
            i,
            input.mapBaseLine?.(d.file, d.line) ?? d.line,
          );
        })
        .sort((a, b) => a.line - b.line),
    );
    for (const kind of ['exact', 'fingerprint', 'message'] as const) {
      const buckets = new Map<string, Candidate[]>();
      for (const head of unmatchedHeads.values()) {
        const key = keyFor(kind, head);
        if (key === null) continue;
        const bucket = buckets.get(key) ?? [];
        bucket.push(head);
        buckets.set(key, bucket);
      }
      for (const base of unmatchedBases) {
        const key = keyFor(kind, base);
        const bucket = key === null ? undefined : buckets.get(key);
        if (!bucket || bucket.length === 0) continue;
        let closest = 0;
        for (let i = 1; i < bucket.length; i += 1) {
          if (
            Math.abs(bucket[i]!.line - base.line) <
            Math.abs(bucket[closest]!.line - base.line)
          ) {
            closest = i;
          }
        }
        const [head] = bucket.splice(closest, 1);
        unmatchedHeads.delete(head!.index);
        unmatchedBases.delete(base);
      }
    }
    for (const base of unmatchedBases) {
      let best: Candidate | undefined;
      let bestSimilarity = -1;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const head of unmatchedHeads.values()) {
        const sim = similarity(head, base);
        const distance = Math.abs(head.line - base.line);
        if (
          sim > bestSimilarity ||
          (sim === bestSimilarity && distance < bestDistance)
        ) {
          best = head;
          bestSimilarity = sim;
          bestDistance = distance;
        }
      }
      unmatchedHeads.delete(best!.index);
    }
    for (const i of unmatchedHeads.keys()) newIndexes.add(i);
  }

  return {
    newDiagnostics: input.head.filter((_d, i) => newIndexes.has(i)),
    matchedCount,
    fixedCount,
  };
}
