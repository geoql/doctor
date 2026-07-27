import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/design.js', () => ({
  runDesignScan: vi.fn().mockRejectedValue('scan backend unavailable'),
}));

import { run } from '../src/cli.js';

describe('design command non-Error failure', () => {
  it('exits 2 and prints the raw thrown value', async () => {
    const errs: string[] = [];
    const write = process.stderr.write.bind(process.stderr);
    process.stderr.write = ((chunk: string) => {
      errs.push(String(chunk));
      return true;
    }) as typeof process.stderr.write;
    process.exitCode = undefined;
    try {
      await run(['node', 'nuxt-doctor', 'design', '.']);
    } finally {
      process.stderr.write = write;
    }
    expect(process.exitCode).toBe(2);
    expect(errs.join('')).toContain('scan backend unavailable');
    process.exitCode = undefined;
  });
});
