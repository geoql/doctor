// Frozen copy of the original hand-rolled validateConfig (pre-zod migration).
// This is the behavioral-parity ORACLE: the zod-based validateConfig must make
// the SAME accept/reject decision as this function on every real-world config
// (i.e. configs that use real rule ids / presets / thresholds). The one
// intended divergence is unknown rule ids — the zod validator now rejects them,
// so the parity corpus deliberately excludes synthetic unknown ids.
//
// Do NOT "improve" this file. It exists solely to pin parity against history.

class LegacyInvalidConfigError extends Error {
  override name = 'InvalidConfigError' as const;
}

const VALID_SEVERITIES = new Set(['error', 'warn', 'info', 'off']);
const VALID_FAIL_ON = new Set(['error', 'warn', 'none']);
const PRESET_NAMES = new Set(['minimal', 'recommended', 'strict', 'all']);

export function legacyValidateConfig(raw: unknown): void {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new LegacyInvalidConfigError('config: must be an object');
  }

  const config = raw as Record<string, unknown>;

  if ('threshold' in config) {
    const threshold = config.threshold;
    if (typeof threshold !== 'number' || !Number.isInteger(threshold)) {
      throw new LegacyInvalidConfigError(
        `threshold: must be an integer 0..100, got ${JSON.stringify(threshold)}`,
      );
    }
    if (threshold < 0 || threshold > 100) {
      throw new LegacyInvalidConfigError(
        `threshold: must be 0..100, got ${threshold}`,
      );
    }
  }

  if ('preset' in config) {
    const preset = config.preset;
    if (typeof preset !== 'string' || !PRESET_NAMES.has(preset)) {
      throw new LegacyInvalidConfigError(
        `preset: must be one of 'minimal', 'recommended', 'strict', 'all', got ${JSON.stringify(preset)}`,
      );
    }
  }

  if ('failOn' in config) {
    const failOn = config.failOn;
    if (typeof failOn !== 'string' || !VALID_FAIL_ON.has(failOn)) {
      throw new LegacyInvalidConfigError(
        `failOn: must be 'error', 'warn', or 'none', got ${JSON.stringify(failOn)}`,
      );
    }
  }

  if ('include' in config) {
    const include = config.include;
    if (!Array.isArray(include)) {
      throw new LegacyInvalidConfigError(
        'include: must be an array of strings',
      );
    }
    if (!include.every((v) => typeof v === 'string')) {
      throw new LegacyInvalidConfigError(
        'include: must be an array of strings',
      );
    }
  }

  if ('exclude' in config) {
    const exclude = config.exclude;
    if (!Array.isArray(exclude)) {
      throw new LegacyInvalidConfigError(
        'exclude: must be an array of strings',
      );
    }
    if (!exclude.every((v) => typeof v === 'string')) {
      throw new LegacyInvalidConfigError(
        'exclude: must be an array of strings',
      );
    }
  }

  if ('fixExcludes' in config) {
    const fixExcludes = config.fixExcludes;
    if (!Array.isArray(fixExcludes)) {
      throw new LegacyInvalidConfigError(
        'fixExcludes: must be an array of strings',
      );
    }
    if (!fixExcludes.every((v) => typeof v === 'string')) {
      throw new LegacyInvalidConfigError(
        'fixExcludes: must be an array of strings',
      );
    }
  }

  if ('rules' in config) {
    const rules = config.rules;
    if (rules === null || typeof rules !== 'object' || Array.isArray(rules)) {
      throw new LegacyInvalidConfigError('rules: must be an object');
    }
    for (const [key, value] of Object.entries(
      rules as Record<string, unknown>,
    )) {
      if (typeof value !== 'string' || !VALID_SEVERITIES.has(value)) {
        throw new LegacyInvalidConfigError(
          `rules.${key}: must be a severity ('error', 'warn', 'info', or 'off'), got ${JSON.stringify(value)}`,
        );
      }
    }
  }
}
