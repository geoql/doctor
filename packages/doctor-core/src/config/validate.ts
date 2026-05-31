import { InvalidConfigError } from './errors.js';
import { isPresetName } from './presets.js';

const VALID_SEVERITIES = new Set(['error', 'warn', 'info', 'off']);
const VALID_FAIL_ON = new Set(['error', 'warn']);

export function validateConfig(raw: unknown): void {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new InvalidConfigError('config: must be an object');
  }

  const config = raw as Record<string, unknown>;

  if ('threshold' in config) {
    const threshold = config.threshold;
    if (typeof threshold !== 'number' || !Number.isInteger(threshold)) {
      throw new InvalidConfigError(
        `threshold: must be an integer 0..100, got ${JSON.stringify(threshold)}`,
      );
    }
    if (threshold < 0 || threshold > 100) {
      throw new InvalidConfigError(
        `threshold: must be 0..100, got ${threshold}`,
      );
    }
  }

  if ('preset' in config) {
    const preset = config.preset;
    if (typeof preset !== 'string' || !isPresetName(preset)) {
      throw new InvalidConfigError(
        `preset: must be one of 'minimal', 'recommended', 'strict', 'all', got ${JSON.stringify(preset)}`,
      );
    }
  }

  if ('failOn' in config) {
    const failOn = config.failOn;
    if (typeof failOn !== 'string' || !VALID_FAIL_ON.has(failOn)) {
      throw new InvalidConfigError(
        `failOn: must be 'error' or 'warn', got ${JSON.stringify(failOn)}`,
      );
    }
  }

  if ('include' in config) {
    const include = config.include;
    if (!Array.isArray(include)) {
      throw new InvalidConfigError('include: must be an array of strings');
    }
    if (!include.every((v) => typeof v === 'string')) {
      throw new InvalidConfigError('include: must be an array of strings');
    }
  }

  if ('exclude' in config) {
    const exclude = config.exclude;
    if (!Array.isArray(exclude)) {
      throw new InvalidConfigError('exclude: must be an array of strings');
    }
    if (!exclude.every((v) => typeof v === 'string')) {
      throw new InvalidConfigError('exclude: must be an array of strings');
    }
  }

  if ('rules' in config) {
    const rules = config.rules;
    if (rules === null || typeof rules !== 'object' || Array.isArray(rules)) {
      throw new InvalidConfigError('rules: must be an object');
    }
    for (const [key, value] of Object.entries(
      rules as Record<string, unknown>,
    )) {
      if (typeof value !== 'string' || !VALID_SEVERITIES.has(value)) {
        throw new InvalidConfigError(
          `rules.${key}: must be a severity ('error', 'warn', 'info', or 'off'), got ${JSON.stringify(value)}`,
        );
      }
    }
  }
}
