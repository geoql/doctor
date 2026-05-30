import { render, type Theme } from './render.js';
import type { ReporterInput, ReporterOptions } from './types.js';

const plainTheme: Theme = {
  severity: (severity) => severity,
  scoreValue: (score) => String(score),
};

export function agentReport(
  input: ReporterInput,
  options?: ReporterOptions,
): string {
  return render(input, options, plainTheme);
}
