export class ConfigFileNotFoundError extends Error {
  override name = 'ConfigFileNotFoundError' as const;

  constructor(path: string) {
    super(`Config file not found: ${path}`);
  }
}

export class ConfigCycleError extends Error {
  override name = 'ConfigCycleError' as const;

  constructor(chain: string[]) {
    super(`Config extends cycle detected: ${chain.join(' -> ')}`);
  }
}

export class InvalidConfigError extends Error {
  override name = 'InvalidConfigError' as const;
}
