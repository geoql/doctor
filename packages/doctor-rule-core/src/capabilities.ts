import type { RuleContext } from './types.js';

/** Settings namespace that carries the project's capability tokens. */
export const CAPABILITIES_SETTINGS_KEY = 'vue-doctor';

/**
 * Read capability tokens from linter `settings`
 * (`settings['vue-doctor'].capabilities`).
 */
export function deriveCapabilities(
  settings: Record<string, unknown> | undefined,
  namespace: string = CAPABILITIES_SETTINGS_KEY,
): Set<string> {
  if (!settings) return new Set();
  const inner = settings[namespace] as Record<string, unknown> | undefined;
  if (!inner) return new Set();
  const value = inner['capabilities'];
  if (!Array.isArray(value)) return new Set();
  return new Set(value.filter((v): v is string => typeof v === 'string'));
}

/**
 * The capability set a rule should gate on. ESLint's wrapper passes
 * `context.capabilities`; oxlint JS plugins only get `context.settings`, which
 * doctor-core fills from the detected project.
 */
export function capabilitiesOf(context: RuleContext): Set<string> {
  return context.capabilities ?? deriveCapabilities(context.settings);
}
