import type { Severity } from '../types.js';

export const BUILT_IN_RECOMMENDED: Omit<
  import('./types.js').ResolvedDoctorConfig,
  'rootDir' | 'source' | 'configFile'
> = {
  include: ['**/*.vue', '**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.nuxt/**',
    '**/.output/**',
    '**/coverage/**',
  ],
  failOn: 'error' as const,
  threshold: 0,
  rules: {} as Record<string, Severity>,
};
