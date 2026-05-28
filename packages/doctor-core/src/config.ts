import { loadConfig } from 'c12';
import type { AuditConfig } from './types.js';

const DEFAULTS: Required<Pick<AuditConfig, 'include' | 'exclude' | 'failOn'>> =
  {
    include: ['**/*.vue', '**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    exclude: ['node_modules', 'dist', '.nuxt', '.output', 'coverage'],
    failOn: 'error',
  };

export interface LoadedConfig {
  config: AuditConfig;
  configFile?: string;
}

export async function loadAuditConfig(
  rootDir: string,
  explicitPath?: string,
): Promise<LoadedConfig> {
  const { config, configFile } = await loadConfig<AuditConfig>({
    cwd: rootDir,
    name: 'doctor',
    configFile: explicitPath,
    defaults: DEFAULTS as AuditConfig,
  });
  return { config: { rootDir, ...config }, configFile };
}
