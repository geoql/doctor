import { agentReport } from './agent.js';
import { jsonCompactReport } from './json-compact.js';
import { jsonReport } from './json.js';
import { prettyReport } from './pretty.js';
import { renderVerboseTrace, type VerboseTraceOptions } from './verbose.js';
import type { ReporterInput, ReporterOptions } from './types.js';

export type ReporterFormat = 'agent' | 'pretty' | 'json' | 'json-compact';

export { renderVerboseTrace, type VerboseTraceOptions };

export function format(
  input: ReporterInput,
  kind: ReporterFormat = 'agent',
  options?: ReporterOptions,
): string {
  if (kind === 'pretty') return prettyReport(input, options);
  if (kind === 'json') return jsonReport(input);
  if (kind === 'json-compact') return jsonCompactReport(input);
  return agentReport(input, options);
}
