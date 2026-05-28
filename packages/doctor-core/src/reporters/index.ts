import type { AuditReport } from '../types.js';
import { formatJson } from './json.js';
import { formatText } from './text.js';

export type ReporterFormat = 'text' | 'json';

export function format(report: AuditReport, kind: ReporterFormat): string {
  if (kind === 'json') return formatJson(report);
  return formatText(report);
}
