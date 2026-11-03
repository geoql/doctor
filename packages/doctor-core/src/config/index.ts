export { BUILT_IN_RECOMMENDED } from './built-in.js';
export type { CliOverrides } from './merge-cli-overrides.js';
export {
  ConfigCycleError,
  ConfigFileNotFoundError,
  InvalidConfigError,
} from './errors.js';
export type {
  ConfigSource,
  DoctorIgnoreConfig,
  DoctorSurface,
  DoctorSurfacesConfig,
  DoctorUserConfig,
  ResolvedDoctorConfig,
  SurfaceControls,
} from './types.js';
export {
  applyConfigFilters,
  isDiagnosticOnSurface,
  type ApplyConfigFiltersOptions,
} from './apply-config-filters.js';
export {
  defaultRuleLevel,
  isRuleLevel,
  setRuleLevel,
  upsertRuleInSource,
  type RuleLevel,
  type SetRuleLevelOptions,
  type SetRuleLevelResult,
} from './edit-rule.js';
export { defineConfig } from './define-config.js';
export { loadDoctorConfig } from './load.js';
export { mergeCliOverrides } from './merge-cli-overrides.js';
export { validateConfig } from './validate.js';
export {
  buildJsonSchema,
  DoctorUserConfigSchema,
  IgnoreOverrideSchema,
  IgnoreSchema,
  LevelSchema,
  SurfaceControlsSchema,
  SurfacesSchema,
  RuleEntrySchema,
  type DoctorUserConfigInput,
} from './schema.js';
