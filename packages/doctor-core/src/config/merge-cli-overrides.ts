import type { ResolvedDoctorConfig } from './types.js';
import type { Severity } from '../types.js';

export interface CliOverrides {
  include?: string[];
  exclude?: string[];
  failOn?: 'error' | 'warn' | 'none';
  threshold?: number;
  rules?: Record<string, Severity | 'off'>;
}

export function mergeCliOverrides(
  resolved: ResolvedDoctorConfig,
  cli: CliOverrides,
): ResolvedDoctorConfig {
  const rules = { ...resolved.rules };

  if (cli.rules) {
    for (const [key, value] of Object.entries(cli.rules)) {
      if (value === 'off') {
        delete rules[key];
      } else {
        rules[key] = value;
      }
    }
  }

  return {
    rootDir: resolved.rootDir,
    include: cli.include ?? resolved.include,
    exclude: cli.exclude ?? resolved.exclude,
    failOn: cli.failOn ?? resolved.failOn,
    threshold: cli.threshold ?? resolved.threshold,
    rules,
    source: resolved.source,
    configFile: resolved.configFile,
  };
}
