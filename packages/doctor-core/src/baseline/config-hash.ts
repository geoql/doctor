import { createHash } from 'node:crypto';
import type { Severity } from '../types.js';

/**
 * Every setting that changes WHICH findings a scan can produce. Two reports
 * are only comparable as baseline/head when these match.
 */
export interface ConfigHashInput {
  readonly rules: Readonly<Record<string, Severity>>;
  readonly include: readonly string[];
  readonly exclude: readonly string[];
  readonly respectInlineDisables: boolean;
  readonly lint: boolean;
  readonly deadCode: boolean;
  /** Config `ignore` / `surfaces` controls (any JSON-serializable shape). */
  readonly filters?: unknown;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [
          key,
          canonicalize((value as Record<string, unknown>)[key]),
        ]),
    );
  }
  return value;
}

export function computeConfigHash(input: ConfigHashInput): string {
  const canonical = {
    rules: Object.keys(input.rules)
      .sort()
      .map((id) => [id, input.rules[id]]),
    include: [...input.include].sort(),
    exclude: [...input.exclude].sort(),
    respectInlineDisables: input.respectInlineDisables,
    lint: input.lint,
    deadCode: input.deadCode,
    filters: canonicalize(input.filters ?? null),
  };
  return createHash('sha256')
    .update(JSON.stringify(canonical))
    .digest('hex')
    .slice(0, 16);
}

/** One hash for a multi-project (`--project`) run: order-independent. */
export function combineConfigHashes(hashes: readonly string[]): string {
  const unique = [...new Set(hashes)].sort();
  if (unique.length === 1) return unique[0]!;
  return createHash('sha256')
    .update(unique.join('\n'))
    .digest('hex')
    .slice(0, 16);
}
