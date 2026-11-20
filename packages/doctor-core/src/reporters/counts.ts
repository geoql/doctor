import type { ReporterInput } from './types.js';

export interface FindingCounts {
  /** Findings the report lists. */
  readonly listed: number;
  /** Findings that count toward the score and severity counts. */
  readonly scored: number;
  /** Listed test/story-file findings left out of the score and the gate. */
  readonly unscoredTestFiles: number;
}

/**
 * Listed vs scored totals for a report. Test/story-file findings are listed
 * but stay out of the score and the `--fail-on` gate unless
 * `includeTestFiles` is set, so the two totals can differ.
 */
export function findingCounts(input: ReporterInput): FindingCounts {
  return {
    listed: input.diagnostics.length,
    scored: input.score.totalFindings,
    unscoredTestFiles: input.includeTestFiles
      ? 0
      : input.diagnostics.filter((d) => d.surface === 'test').length,
  };
}

export const TEST_FILES_HINT = 'use --include-test-files';
