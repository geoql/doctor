/**
 * Per-key debounced scheduler. Each editor scope (a document URI, or a
 * workspace root) gets one in-flight audit at a time: rapid edits to the same
 * document collapse into a single trailing run, and a monotonic generation
 * per key supersedes stale work so a slow audit can never clobber a fresher
 * result. Save scans pass `debounceMs: 0` to run immediately.
 */
export interface SchedulerOptions {
  /** Trailing debounce window for an enqueued key, in ms. Default 400. */
  readonly debounceMs?: number;
  /** Runs the audit for a key; rejections are surfaced via `onError`. */
  readonly performScan: (
    key: string,
    token: CancellationToken,
  ) => Promise<void>;
  /** Called when a `performScan` promise rejects. */
  readonly onError?: (error: unknown, key: string) => void;
}

/** Cooperative cancellation: `true` once a newer enqueue superseded the run. */
export interface CancellationToken {
  readonly isCancelled: boolean;
}

export interface Scheduler {
  /** Queue (or re-queue) an audit for `key`, debounced. `delayMs` overrides the default. */
  readonly enqueue: (key: string, delayMs?: number) => void;
  /** Cancel any pending/in-flight work for `key`. */
  readonly cancel: (key: string) => void;
  /** Pending timers + in-flight runs; for tests and idle checks. */
  readonly pendingCount: () => number;
  /** Stop all timers and abandon queued work. */
  readonly dispose: () => void;
}

export const createScheduler = (options: SchedulerOptions): Scheduler => {
  const defaultDebounceMs = options.debounceMs ?? 400;
  let disposed = false;
  let generation = 0;
  let running = 0;
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const latestGeneration = new Map<string, number>();

  const run = (key: string, id: number): void => {
    running += 1;
    const token: CancellationToken = {
      get isCancelled() {
        return disposed || latestGeneration.get(key) !== id;
      },
    };
    Promise.resolve(options.performScan(key, token))
      .catch((error: unknown) => {
        options.onError?.(error, key);
      })
      .finally(() => {
        running -= 1;
      });
  };

  const enqueue = (key: string, delayMs?: number): void => {
    if (disposed) return;
    const id = (generation += 1);
    latestGeneration.set(key, id);

    const existing = timers.get(key);
    if (existing) clearTimeout(existing);

    const delay = delayMs ?? defaultDebounceMs;
    const timer = setTimeout(() => {
      timers.delete(key);
      run(key, id);
    }, delay);
    if (typeof timer.unref === 'function') timer.unref();
    timers.set(key, timer);
  };

  const cancel = (key: string): void => {
    const timer = timers.get(key);
    if (timer) {
      clearTimeout(timer);
      timers.delete(key);
    }
    // Bump to a generation no live request carries → supersedes in-flight work.
    latestGeneration.set(key, (generation += 1));
  };

  const dispose = (): void => {
    disposed = true;
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
  };

  const pendingCount = (): number => timers.size + running;

  return { enqueue, cancel, pendingCount, dispose };
};
