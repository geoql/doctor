import type { DoctorUserConfig } from './types.js';

export function defineConfig<T extends DoctorUserConfig>(config: T): T {
  return config;
}
