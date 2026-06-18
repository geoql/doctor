import { describe, expect, it } from 'vitest';
import { createScheduler, type CancellationToken } from './scheduler.js';

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (
  predicate: () => boolean,
  timeoutMs = 2000,
): Promise<void> => {
  const start = Date.now();
  while (!predicate() && Date.now() - start < timeoutMs) await delay(5);
};

describe('createScheduler', () => {
  it('debounces and coalesces rapid enqueues for one key into a single scan', async () => {
    let scanCount = 0;
    const scheduler = createScheduler({
      debounceMs: 15,
      performScan: async () => {
        scanCount += 1;
      },
    });

    scheduler.enqueue('doc');
    scheduler.enqueue('doc');
    scheduler.enqueue('doc');
    await delay(70);

    expect(scanCount).toBe(1);
    scheduler.dispose();
  });

  it('runs distinct keys independently', async () => {
    const ran: string[] = [];
    const scheduler = createScheduler({
      debounceMs: 5,
      performScan: async (key) => {
        ran.push(key);
      },
    });

    scheduler.enqueue('a');
    scheduler.enqueue('b');
    await waitFor(() => ran.length === 2);

    expect(ran.sort()).toEqual(['a', 'b']);
    scheduler.dispose();
  });

  it('honors a per-enqueue delay override (save runs immediately)', async () => {
    let scanCount = 0;
    const scheduler = createScheduler({
      debounceMs: 10_000,
      performScan: async () => {
        scanCount += 1;
      },
    });

    scheduler.enqueue('doc', 0);
    await waitFor(() => scanCount === 1);

    expect(scanCount).toBe(1);
    scheduler.dispose();
  });

  it('supersedes an in-flight scan so a stale run is cancelled mid-flight', async () => {
    const observed: boolean[] = [];
    const scheduler = createScheduler({
      debounceMs: 5,
      performScan: async (_key, token: CancellationToken) => {
        await delay(40);
        observed.push(token.isCancelled);
      },
    });

    scheduler.enqueue('doc');
    await delay(20);
    scheduler.enqueue('doc');
    await delay(120);

    // First run observed itself cancelled; second run observed live.
    expect(observed).toContain(true);
    expect(observed).toContain(false);
    scheduler.dispose();
  });

  it('cancel prevents a pending scan from running', async () => {
    let scanCount = 0;
    const scheduler = createScheduler({
      debounceMs: 30,
      performScan: async () => {
        scanCount += 1;
      },
    });

    scheduler.enqueue('doc');
    scheduler.cancel('doc');
    await delay(70);

    expect(scanCount).toBe(0);
    scheduler.dispose();
  });

  it('cancel of an unknown key is a no-op', async () => {
    const scheduler = createScheduler({ performScan: async () => {} });
    expect(() => scheduler.cancel('missing')).not.toThrow();
    scheduler.dispose();
  });

  it('routes a rejected scan to onError', async () => {
    const errors: string[] = [];
    const scheduler = createScheduler({
      debounceMs: 5,
      performScan: async () => {
        throw new Error('boom');
      },
      onError: (error) =>
        errors.push(error instanceof Error ? error.message : String(error)),
    });

    scheduler.enqueue('doc');
    await waitFor(() => errors.length === 1);

    expect(errors).toEqual(['boom']);
    scheduler.dispose();
  });

  it('swallows a rejected scan when no onError is provided', async () => {
    const scheduler = createScheduler({
      debounceMs: 5,
      performScan: async () => {
        throw new Error('quiet');
      },
    });

    scheduler.enqueue('doc');
    await delay(40);

    expect(scheduler.pendingCount()).toBe(0);
    scheduler.dispose();
  });

  it('reports pending timers and ignores enqueues after dispose', async () => {
    const scheduler = createScheduler({
      debounceMs: 50,
      performScan: async () => {},
    });
    scheduler.enqueue('doc');
    expect(scheduler.pendingCount()).toBe(1);

    scheduler.dispose();
    scheduler.enqueue('doc');
    await delay(70);
    expect(scheduler.pendingCount()).toBe(0);
  });
});
