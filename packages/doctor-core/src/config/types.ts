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
  rules?: Record<string, Severity | 'off'>;
  extends?: string[];
}

export interface ResolvedDoctorConfig {
  rootDir: string;
  include: string[];
  exclude: string[];
  failOn: 'error' | 'warn';
  threshold: number;
  rules: Record<string, Severity>;
  source: ConfigSource;
  configFile?: string;
}
