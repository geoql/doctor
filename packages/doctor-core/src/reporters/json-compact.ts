import { buildDoctorReport } from './json.js';
import type { ReporterInput } from './types.js';

export function jsonCompactReport(input: ReporterInput): string {
  return `${JSON.stringify(buildDoctorReport(input))}\n`;
}
