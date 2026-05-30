const STDERR_TAIL_LIMIT = 2000;

export class OxlintSpawnFailed extends Error {
  override name = 'OxlintSpawnFailed' as const;

  constructor(exitCode: number | null, stderr: string) {
    const tail = stderr.slice(-STDERR_TAIL_LIMIT);
    super(`oxlint subprocess exited with code ${exitCode}: ${tail}`);
  }
}

export class OxlintOutputTooLarge extends Error {
  override name = 'OxlintOutputTooLarge' as const;

  constructor(maxBytes: number) {
    super(`oxlint subprocess output exceeded ${maxBytes} bytes`);
  }
}
