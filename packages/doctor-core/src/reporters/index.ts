import { agentReport } from './agent.js';
import { htmlReport } from './html.js';
import { jsonCompactReport } from './json-compact.js';
import { jsonReport } from './json.js';
import { prettyReport } from './pretty.js';
import { sarifReport } from './sarif.js';
import { renderVerboseTrace, type VerboseTraceOptions } from './verbose.js';
import type { ReporterInput, ReporterOptions } from './types.js';

export type ReporterFormat =
  | 'agent'
  | 'pretty'
  | 'json'
  | 'json-compact'
  | 'sarif'
  | 'html';

export { renderVerboseTrace, type VerboseTraceOptions };

export function format(
  input: ReporterInput,
  kind: ReporterFormat = 'agent',
  options?: ReporterOptions,
): string {
  if (kind === 'pretty') return prettyReport(input, options);
  if (kind === 'json') return jsonReport(input);
  if (kind === 'json-compact') return jsonCompactReport(input);
  if (kind === 'sarif') return sarifReport(input);
  if (kind === 'html') return htmlReport(input);
  return agentReport(input, options);
}
