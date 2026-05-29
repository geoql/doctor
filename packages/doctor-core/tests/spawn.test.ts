import { chmod, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runOxlint } from '../src/oxlint/spawn.js';
import type { OxlintRunOptions } from '../src/oxlint/types.js';

async function tmp(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'geoql-doctor-spawn-'));
}

async function fakeBin(body: string): Promise<string> {
  const dir = await tmp();
  const path = join(dir, 'fake-oxlint.sh');
  await writeFile(path, `#!/bin/sh\n${body}\n`);
  await chmod(path, 0o755);
  return path;
}

function opts(
  oxlintBin: string,
  extra: Partial<OxlintRunOptions> = {},
): OxlintRunOptions {
  return {
    rootDir: tmpdir(),
    targetPath: tmpdir(),
    configPath: '/tmp/.oxlintrc.json',
    oxlintBin,
    ...extra,
  };
}

describe('runOxlint', () => {
  it('parses a JSON object with a diagnostics array', async () => {
    const bin = await fakeBin(
      `printf '%s' '{"diagnostics":[{"filename":"a.vue","message":"m","severity":"error"}]}'`,
    );
    const res = await runOxlint(opts(bin));
    expect(res.diagnostics).toHaveLength(1);
    expect(res.diagnostics[0]?.message).toBe('m');
    expect(res.exitCode).toBe(0);
  });

  it('parses a top-level JSON array', async () => {
    const bin = await fakeBin(
      `printf '%s' '[{"filename":"a.vue","message":"arr","severity":"warning"}]'`,
    );
    const res = await runOxlint(opts(bin));
    expect(res.diagnostics).toHaveLength(1);
    expect(res.diagnostics[0]?.message).toBe('arr');
  });

  it('returns [] for a JSON object without a diagnostics field', async () => {
    const bin = await fakeBin(`printf '%s' '{"other":true}'`);
    const res = await runOxlint(opts(bin));
    expect(res.diagnostics).toEqual([]);
  });

  it('returns [] for empty stdout', async () => {
    const bin = await fakeBin(`printf ''`);
    const res = await runOxlint(opts(bin));
    expect(res.diagnostics).toEqual([]);
  });

  it('falls back to NDJSON parsing and skips non-JSON lines', async () => {
    const bin = await fakeBin(
      `printf '%s\\n%s\\n%s\\n' '{"filename":"a.vue","message":"one","severity":"error"}' 'not json at all' '{"filename":"b.vue","message":"two","severity":"warning"}'`,
    );
    const res = await runOxlint(opts(bin));
    expect(res.diagnostics).toHaveLength(2);
    expect(res.diagnostics.map((d) => d.message)).toEqual(['one', 'two']);
  });

  it('skips NDJSON objects lacking a message field', async () => {
    const bin = await fakeBin(
      `printf '%s\\n%s\\n' '{"nomessage":1}' '{"message":"kept","filename":"c.vue","severity":"error"}'`,
    );
    const res = await runOxlint(opts(bin));
    expect(res.diagnostics).toHaveLength(1);
    expect(res.diagnostics[0]?.message).toBe('kept');
  });

  it('captures stderr output', async () => {
    const bin = await fakeBin(`printf 'oops' 1>&2; printf '[]'`);
    const res = await runOxlint(opts(bin));
    expect(res.stderr).toContain('oops');
    expect(res.diagnostics).toEqual([]);
  });

  it('rejects when the binary does not exist (error event)', async () => {
    await expect(
      runOxlint(opts('/no/such/oxlint/binary-xyz')),
    ).rejects.toThrow();
  });

  it('rejects on a spawn error even with the timeout disabled', async () => {
    await expect(
      runOxlint(opts('/no/such/oxlint/binary-xyz', { timeoutMs: 0 })),
    ).rejects.toThrow();
  });

  it('rejects and kills the child when it exceeds the timeout', async () => {
    const bin = await fakeBin(`sleep 5; printf '[]'`);
    await expect(runOxlint(opts(bin, { timeoutMs: 50 }))).rejects.toThrow(
      /timed out after 50ms/,
    );
  });

  it('disables the timeout timer when timeoutMs is 0', async () => {
    const bin = await fakeBin(`printf '[]'`);
    const res = await runOxlint(opts(bin, { timeoutMs: 0 }));
    expect(res.diagnostics).toEqual([]);
  });
});
