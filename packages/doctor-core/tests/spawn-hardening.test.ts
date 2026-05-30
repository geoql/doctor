import { existsSync } from 'node:fs';
import { chmod, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { describe, expect, it } from 'vitest';
import {
  OXLINT_MAX_OUTPUT_BYTES,
  OXLINT_SPAWN_TIMEOUT_MS,
  runOxlint,
} from '../src/oxlint/spawn.js';
import {
  OxlintOutputTooLarge,
  OxlintSpawnFailed,
} from '../src/oxlint/errors.js';
import type { OxlintRunOptions } from '../src/oxlint/types.js';

async function tmp(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'geoql-doctor-spawn-hard-'));
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

async function isDead(pid: number): Promise<boolean> {
  for (let i = 0; i < 100; i += 1) {
    try {
      process.kill(pid, 0);
    } catch {
      return true;
    }
    await delay(20);
  }
  return false;
}

async function readPid(pidFile: string): Promise<number> {
  for (let i = 0; i < 100; i += 1) {
    if (existsSync(pidFile)) {
      const raw = (await readFile(pidFile, 'utf8')).trim();
      if (raw) return Number(raw);
    }
    await delay(20);
  }
  throw new Error('pid file never written');
}

describe('runOxlint hardening constants', () => {
  it('exports the default spawn timeout and output cap', () => {
    expect(OXLINT_SPAWN_TIMEOUT_MS).toBe(60_000);
    expect(OXLINT_MAX_OUTPUT_BYTES).toBe(32 * 1024 * 1024);
  });
});

describe('runOxlint output overflow', () => {
  it('rejects with OxlintOutputTooLarge and kills the child when stdout floods', async () => {
    const dir = await tmp();
    const pidFile = join(dir, 'pid');
    const chunk = 'x'.repeat(1024);
    const bin = await fakeBin(
      `echo $$ > '${pidFile}'\ni=0\nwhile [ $i -lt 256 ]; do printf '%s' '${chunk}'; i=$((i+1)); done`,
    );
    await expect(
      runOxlint(opts(bin, { maxOutputBytes: 4096, timeoutMs: 5000 })),
    ).rejects.toBeInstanceOf(OxlintOutputTooLarge);
    const pid = await readPid(pidFile);
    expect(await isDead(pid)).toBe(true);
  });
});

describe('runOxlint timeout kills the child', () => {
  it('SIGKILLs the sleeping child on timeout', async () => {
    const dir = await tmp();
    const pidFile = join(dir, 'pid');
    const bin = await fakeBin(`echo $$ > '${pidFile}'\nsleep 5\nprintf '[]'`);
    await expect(runOxlint(opts(bin, { timeoutMs: 1000 }))).rejects.toThrow(
      /timed out after 1000ms/,
    );
    const pid = await readPid(pidFile);
    expect(await isDead(pid)).toBe(true);
  });
});

describe('runOxlint non-zero exit discrimination', () => {
  it('resolves [] on exit 0 with empty stdout', async () => {
    const bin = await fakeBin(`printf ''; exit 0`);
    const res = await runOxlint(opts(bin));
    expect(res.diagnostics).toEqual([]);
    expect(res.exitCode).toBe(0);
  });

  it('resolves diagnostics on a non-zero exit when stdout parses (lint found)', async () => {
    const bin = await fakeBin(
      `printf '%s' '[{"filename":"a.vue","message":"m","severity":"error"}]'; exit 1`,
    );
    const res = await runOxlint(opts(bin));
    expect(res.diagnostics).toHaveLength(1);
    expect(res.exitCode).toBe(1);
  });

  it('rejects with OxlintSpawnFailed on a non-zero exit with empty stdout', async () => {
    const bin = await fakeBin(`printf 'kaboom' 1>&2; exit 3`);
    await expect(runOxlint(opts(bin))).rejects.toBeInstanceOf(
      OxlintSpawnFailed,
    );
  });

  it('rejects with OxlintSpawnFailed on a non-zero exit with unparseable garbage', async () => {
    const bin = await fakeBin(`printf 'total garbage not json'; exit 1`);
    await expect(runOxlint(opts(bin))).rejects.toBeInstanceOf(
      OxlintSpawnFailed,
    );
  });

  it('trusts exit 0 and resolves [] even when stdout is garbage', async () => {
    const bin = await fakeBin(`printf 'still garbage'; exit 0`);
    const res = await runOxlint(opts(bin));
    expect(res.diagnostics).toEqual([]);
    expect(res.exitCode).toBe(0);
  });
});

describe('runOxlint env sanitization', () => {
  it('strips NODE_OPTIONS and npm_config_* while keeping PATH', async () => {
    const bin = await fakeBin(
      `printf '[{"filename":"e.vue","message":"NODE_OPTIONS=%s npm=%s PATH_SET=%s","severity":"error"}]' "\${NODE_OPTIONS:-UNSET}" "\${npm_config_foo:-UNSET}" "\${PATH:+yes}"`,
    );
    const prevNodeOptions = process.env.NODE_OPTIONS;
    const prevNpm = process.env.npm_config_foo;
    process.env.NODE_OPTIONS = '--max-old-space-size=128';
    process.env.npm_config_foo = 'bar';
    try {
      const res = await runOxlint(opts(bin));
      const message = res.diagnostics[0]?.message ?? '';
      expect(message).toContain('NODE_OPTIONS=UNSET');
      expect(message).toContain('npm=UNSET');
      expect(message).toContain('PATH_SET=yes');
    } finally {
      if (prevNodeOptions === undefined) delete process.env.NODE_OPTIONS;
      else process.env.NODE_OPTIONS = prevNodeOptions;
      if (prevNpm === undefined) delete process.env.npm_config_foo;
      else process.env.npm_config_foo = prevNpm;
    }
  });
});
