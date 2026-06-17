import type { DoctorUserConfigInput } from './schema.js';
import type { Severity } from '../types.js';

export type ConfigSource =
  | 'flag'
  | 'ts'
  | 'mjs'
  | 'js'
  | 'json'
  | 'jsonc'
  | 'package.json'
  | 'built-in';

/**
 * User-authored config shape, inferred from {@link DoctorUserConfigSchema} so
 * the zod schema is the single source of truth for the accepted fields.
 */
export type DoctorUserConfig = DoctorUserConfigInput;

/**
 * Resolved + normalized config that audit consumes. `failOn` and `preset` are
 * narrowed from the schema-derived user shape; `rules` is the merged effective
 * severity map (preset base + user overrides minus explicit offs), so it never
 * carries `'off'`.
 */
export interface ResolvedDoctorConfig {
  rootDir: string;
  include: string[];
  exclude: string[];
  failOn: NonNullable<DoctorUserConfig['failOn']>;
  threshold: number;
  rules: Record<string, Severity>;
  preset: NonNullable<DoctorUserConfig['preset']>;
  source: ConfigSource;
  configFile?: string;
  fixExcludes?: string[];
}
