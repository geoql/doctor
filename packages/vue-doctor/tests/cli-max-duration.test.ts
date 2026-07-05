import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('vue-doctor --max-duration', () => {
  let stdout: string[];
  let stderr: string[];
  let dir: string;
  let originalExitCode: typeof process.exitCode;

  beforeEach(() => {
    stdout = [];
    stderr = [];
    dir = mkdtempSync(join(tmpdir(), 'vue-max-duration-'));
    writeFileSync(join(dir, 'clean.vue'), '<template><div /></template>\n');
    originalExitCode = process.exitCode;
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      stdout.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
      stderr.push(String(chunk));
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = originalExitCode;
    rmSync(dir, { recursive: true, force: true });
  });

  it('reports incomplete=false when the budget is generous', async () => {
    const { run } = await import('../src/cli.js');
    const code = await run([
      'node',
      'vue-doctor',
      '--max-duration',
      '300',
      '--json',
      '--no-dead-code',
      dir,
    ]);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout.join('')) as { incomplete?: boolean };
    expect(parsed.incomplete).toBeUndefined();
  });

  it('reports incomplete=true with skippedCheckReasons when the budget is 0', async () => {
    const { run } = await import('../src/cli.js');
    const code = await run([
      'node',
      'vue-doctor',
      '--max-duration',
      '0',
      '--json',
      dir,
    ]);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout.join('')) as {
      incomplete: boolean;
      skippedCheckReasons: Array<{
        kind: string;
        skippedPasses: string[];
      }>;
      score: { value: number };
    };
    expect(parsed.incomplete).toBe(true);
    expect(parsed.skippedCheckReasons[0]!.kind).toBe('time-budget-exhausted');
    expect(parsed.skippedCheckReasons[0]!.skippedPasses).toContain('lint');
    expect(typeof parsed.score.value).toBe('number');
  });

  it('aggregates skippedCheckReasons across --project workspaces', async () => {
    const { fileURLToPath } = await import('node:url');
    const { dirname, resolve } = await import('node:path');
    const here = dirname(fileURLToPath(import.meta.url));
    const workspaceDir = resolve(here, 'fixtures/workspace');
    const { run } = await import('../src/cli.js');
    const code = await run([
      'node',
      'vue-doctor',
      '--project',
      'a,b',
      '--max-duration',
      '0',
      '--json',
      workspaceDir,
    ]);
    expect(code).toBe(0);
    const parsed = JSON.parse(stdout.join('')) as {
      incomplete: boolean;
      skippedCheckReasons: Array<{ kind: string }>;
    };
    expect(parsed.incomplete).toBe(true);
    expect(parsed.skippedCheckReasons.length).toBeGreaterThan(0);
  }, 40000);

  it('exits 2 on a non-integer --max-duration', async () => {
    const { run } = await import('../src/cli.js');
    const code = await run([
      'node',
      'vue-doctor',
      '--max-duration',
      'abc',
      dir,
    ]);
    expect(code).toBe(2);
    expect(stderr.join('')).toContain('--max-duration');
  });

  it('exits 2 on a negative --max-duration', async () => {
    const { run } = await import('../src/cli.js');
    const code = await run(['node', 'vue-doctor', '--max-duration=-5', dir]);
    expect(code).toBe(2);
    expect(stderr.join('')).toContain('--max-duration');
  });
});
