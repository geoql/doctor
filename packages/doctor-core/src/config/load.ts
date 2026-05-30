import { existsSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { loadConfig } from 'c12';
import { BUILT_IN_RECOMMENDED } from './built-in.js';
import { ConfigCycleError, ConfigFileNotFoundError } from './errors.js';
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
};

export async function loadDoctorConfig(
  rootDir: string,
  explicitPath?: string,
): Promise<ResolvedDoctorConfig> {
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

  const rules: Record<string, Severity> = {};
  if (raw.rules && typeof raw.rules === 'object') {
    for (const [key, value] of Object.entries(raw.rules)) {
      if (value !== 'off') {
        rules[key] = value as Severity;
      }
    }
  }

  return {
    rootDir,
    include: raw.include ?? BUILT_IN_RECOMMENDED.include,
    exclude: raw.exclude ?? BUILT_IN_RECOMMENDED.exclude,
    failOn: raw.failOn ?? BUILT_IN_RECOMMENDED.failOn,
    threshold: raw.threshold ?? BUILT_IN_RECOMMENDED.threshold,
    rules: { ...BUILT_IN_RECOMMENDED.rules, ...rules },
    source,
    configFile,
  };
}
