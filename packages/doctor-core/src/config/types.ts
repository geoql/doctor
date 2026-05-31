import type { Severity } from '../types.js';

export type ConfigSource =
  | 'flag'
  | 'ts'
  | 'mjs'
  | 'js'
  | 'json'
  | 'package.json'
  | 'built-in';

export interface DoctorUserConfig {
  rootDir?: string;
  include?: string[];
  exclude?: string[];
  failOn?: 'error' | 'warn';
  threshold?: number;
  preset?: string;
  rules?: Record<string, Severity | 'off'>;
  extends?: string[];
}

/**
 * Resolved + normalized config that audit consumes.
 * - `rules` is the merged effective severity map (preset base + user overrides - explicit offs).
 * - `preset` is the preset name that was applied as the base.
 */

export interface ResolvedDoctorConfig {
  rootDir: string;
  include: string[];
  exclude: string[];
  failOn: 'error' | 'warn';
  threshold: number;
  rules: Record<string, Severity>;
  preset: 'minimal' | 'recommended' | 'strict' | 'all';
  source: ConfigSource;
  configFile?: string;
}
