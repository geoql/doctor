import { chmod, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runOxlint } from '../src/oxlint/spawn.js';
import type { OxlintRunOptions } from '../src/oxlint/types.js';

async function tmp(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'geoql-doctor-fix-argv-'));
}

// A fake oxlint that echoes its argv (one per line) to stderr, then emits an
// empty diagnostics array on stdout so runOxlint resolves cleanly.
async function echoArgsBin(): Promise<string> {
  const dir = await tmp();
  const path = join(dir, 'fake-oxlint.sh');
  await writeFile(
    path,
    `#!/bin/sh\nfor a in "$@"; do printf '%s\\n' "$a" 1>&2; done\nprintf '[]'\n`,
  );
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

describe('runOxlint --fix argv wiring', () => {
  it('does NOT pass --fix when fix is unset', async () => {
    const bin = await echoArgsBin();
    const res = await runOxlint(opts(bin));
    expect(res.stderr.split('\n')).not.toContain('--fix');
  });

  it('does NOT pass --fix when fix is false', async () => {
    const bin = await echoArgsBin();
    const res = await runOxlint(opts(bin, { fix: false }));
    expect(res.stderr.split('\n')).not.toContain('--fix');
  });

  it('appends --fix to the argv when fix is true', async () => {
    const bin = await echoArgsBin();
    const res = await runOxlint(opts(bin, { fix: true }));
    expect(res.stderr.split('\n')).toContain('--fix');
  });

  it('never passes the dangerous fix variants', async () => {
    const bin = await echoArgsBin();
    const res = await runOxlint(opts(bin, { fix: true }));
    const argv = res.stderr.split('\n');
    expect(argv).not.toContain('--fix-dangerously');
    expect(argv).not.toContain('--fix-suggestions');
  });
});
