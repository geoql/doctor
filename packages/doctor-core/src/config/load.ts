import { existsSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { loadConfig } from 'c12';
import { BUILT_IN_RECOMMENDED } from './built-in.js';
import {
  ConfigCycleError,
  ConfigFileNotFoundError,
  InvalidConfigError,
} from './errors.js';
import { isPresetName, type PresetName, resolvePreset } from './presets.js';
import type {
  ConfigSource,
  DoctorUserConfig,
  ResolvedDoctorConfig,
} from './types.js';
import { validateConfig } from './validate.js';
import type { Severity } from '../types.js';

const SOURCE_MAP: Record<string, ConfigSource> = {
  ts: 'ts',
  mjs: 'mjs',
  js: 'js',
  json: 'json',
  jsonc: 'jsonc',
};

export interface LoadDoctorConfigOptions {
  readonly explicitPath?: string;
  readonly presetOverride?: string;
}

export async function loadDoctorConfig(
  rootDir: string,
  explicitPathOrOptions?: string | LoadDoctorConfigOptions,
): Promise<ResolvedDoctorConfig> {
  const opts: LoadDoctorConfigOptions =
    typeof explicitPathOrOptions === 'string'
      ? { explicitPath: explicitPathOrOptions }
      : (explicitPathOrOptions ?? {});
  const explicitPath = opts.explicitPath;
  if (opts.presetOverride !== undefined && !isPresetName(opts.presetOverride)) {
    throw new InvalidConfigError(
      `preset: must be one of 'minimal', 'recommended', 'strict', 'all', got ${JSON.stringify(opts.presetOverride)}`,
    );
  }
  if (explicitPath) {
    const absPath = resolve(rootDir, explicitPath);
    if (!existsSync(absPath)) {
      throw new ConfigFileNotFoundError(explicitPath);
    }
  }

  const chain: string[] = [];

  const result = await loadConfig<DoctorUserConfig>({
    cwd: rootDir,
    name: 'doctor',
    packageJson: 'doctor',
    rcFile: false,
    globalRc: false,
    ...(explicitPath ? { configFile: resolve(rootDir, explicitPath) } : {}),
    resolve(source, options) {
      const base = options.cwd;
      const key = resolve(base, source);
      if (chain.includes(key)) {
        throw new ConfigCycleError([...chain, key]);
      }
      chain.push(key);
      return undefined;
    },
  });

  const raw: DoctorUserConfig = result.config as DoctorUserConfig;

  validateConfig(raw);

  let source: ConfigSource;
  let configFile: string | undefined;

  if (explicitPath) {
    source = 'flag';
    configFile = resolve(rootDir, explicitPath);
  } else if (result._configFile) {
    const ext = extname(result._configFile).slice(1) as keyof typeof SOURCE_MAP;
    source = SOURCE_MAP[ext];
    configFile = result._configFile;
  } else if (Object.keys(raw).length > 0) {
    source = 'package.json';
    configFile = resolve(rootDir, 'package.json');
  } else {
    source = 'built-in';
    configFile = undefined;
  }

  // Resolve preset name: CLI override wins, then config file, default 'recommended'.
  const presetName: PresetName = (opts.presetOverride ??
    raw.preset ??
    'recommended') as PresetName;
  const presetRules = resolvePreset(presetName);

  // User config: 'off' explicitly removes the rule from the base preset.
  const userRules: Record<string, Severity> = {};
  const userOff = new Set<string>();
  if (raw.rules && typeof raw.rules === 'object') {
    for (const [key, value] of Object.entries(raw.rules)) {
      if (value === 'off') {
        userOff.add(key);
      } else {
        userRules[key] = value as Severity;
      }
    }
  }

  // Merge: preset base -> user rules on top -> user 'off' removes entries.
  const mergedRules: Record<string, Severity> = {
    ...presetRules,
    ...userRules,
  };
  for (const key of userOff) delete mergedRules[key];

  return {
    rootDir,
    include: raw.include ?? BUILT_IN_RECOMMENDED.include,
    exclude: raw.exclude ?? BUILT_IN_RECOMMENDED.exclude,
    failOn: raw.failOn ?? BUILT_IN_RECOMMENDED.failOn,
    threshold: raw.threshold ?? BUILT_IN_RECOMMENDED.threshold,
    rules: mergedRules,
    preset: presetName,
    source,
    configFile,
    ...(raw.fixExcludes ? { fixExcludes: raw.fixExcludes } : {}),
    ...(raw.includeTestFiles !== undefined
      ? { includeTestFiles: raw.includeTestFiles }
      : {}),
  };
}
