import process from 'node:process';
import pc from 'picocolors';
import { agentReport } from './agent.js';
import { render, type Theme } from './render.js';
import type { ReporterInput, ReporterOptions } from './types.js';

const colors = pc.createColors(true);

const colorTheme: Theme = {
  severity: (severity) => {
    if (severity === 'error') return colors.red(severity);
    if (severity === 'warn') return colors.yellow(severity);
    return colors.cyan(severity);
  },
  scoreValue: (score) => {
    if (score <= 50) return colors.red(String(score));
    if (score <= 79) return colors.yellow(String(score));
    return colors.green(String(score));
  },
};

export function prettyReport(
  input: ReporterInput,
  options?: ReporterOptions,
): string {
  const noColor = options?.color === false || Boolean(process.env.NO_COLOR);
  if (noColor) return agentReport(input, options);
  return render(input, options, colorTheme);
}
