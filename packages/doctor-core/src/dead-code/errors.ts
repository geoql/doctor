export class DeadCodeTimeoutError extends Error {
  override name = 'DeadCodeTimeoutError' as const;

  constructor(timeoutMs: number) {
    super(`Dead-code analysis timed out after ${timeoutMs}ms`);
  }
}

export class DeadCodeImportFailed extends Error {
  override name = 'DeadCodeImportFailed' as const;

  constructor(cause?: unknown) {
    const message =
      cause instanceof Error
        ? `Failed to import knip: ${cause.message}`
        : 'Failed to import knip';
    super(message, { cause });
  }
}
