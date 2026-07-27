// `design [dir]` — focused design-quality scan, delegating to shadscan-vue
// (same author). Mirrors react-doctor's `design` command semantics: a
// separate weighted 0-100 design score, independent of the health score.

import {
  buildJsonReport,
  renderAgentPrompt,
  renderHuman,
  scanProject,
} from 'shadscan-vue';

export interface DesignScanFlags {
  format?: string;
  failUnder?: number;
}

export interface DesignScanResult {
  output: string;
  exitCode: 0 | 1;
  score: number | null;
}

const FORMATS = new Set(['human', 'json', 'agent']);
const ENGINE_VERSION = 'vue-doctor-design';

export async function runDesignScan(
  dir: string,
  flags: DesignScanFlags,
): Promise<DesignScanResult> {
  const format = flags.format ?? 'human';
  if (!FORMATS.has(format)) {
    throw new Error(
      `design: --format must be human | json | agent, got '${format}'`,
    );
  }
  if (flags.failUnder !== undefined) {
    const invalid =
      !Number.isFinite(flags.failUnder) ||
      flags.failUnder < 0 ||
      flags.failUnder > 101;
    if (invalid) {
      throw new Error(
        `design: --fail-under must be a number between 0 and 101, got '${flags.failUnder}'`,
      );
    }
  }

  const result = await scanProject(dir);
  const json = buildJsonReport(result, ENGINE_VERSION);

  let output: string;
  if (format === 'json') {
    output = JSON.stringify(json, null, 2);
  } else if (format === 'agent') {
    output = renderAgentPrompt(result, ENGINE_VERSION);
  } else {
    output = renderHuman(result, ENGINE_VERSION, undefined, false);
  }

  const score = json.score;
  const exitCode: 0 | 1 =
    flags.failUnder !== undefined && score !== null && score < flags.failUnder
      ? 1
      : 0;

  return { output, exitCode, score };
}
