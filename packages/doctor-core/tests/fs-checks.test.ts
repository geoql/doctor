import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  directoryExists,
  resolveExistingFile,
} from '../src/project-info/fs-checks.js';

async function tmp(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'geoql-doctor-fs-checks-'));
}

describe('directoryExists', () => {
  it('returns true for an existing directory', async () => {
    const dir = await tmp();
    await mkdir(join(dir, 'app'), { recursive: true });
    expect(directoryExists(join(dir, 'app'))).toBe(true);
  });

  it('returns false for a missing path', async () => {
    const dir = await tmp();
    expect(directoryExists(join(dir, 'nope'))).toBe(false);
  });

  it('returns false when the path is a file rather than a directory', async () => {
    const dir = await tmp();
    const file = join(dir, 'server');
    await writeFile(file, 'x');
    expect(directoryExists(file)).toBe(false);
  });
});

describe('resolveExistingFile', () => {
  it('returns the absolute path of the first existing candidate', async () => {
    const dir = await tmp();
    await writeFile(join(dir, 'wrangler.toml'), 'name = "app"\n');
    expect(resolveExistingFile(dir, ['wrangler.toml', 'wrangler.json'])).toBe(
      join(dir, 'wrangler.toml'),
    );
  });

  it('skips missing candidates and resolves a later match', async () => {
    const dir = await tmp();
    await writeFile(join(dir, 'wrangler.json'), '{}');
    expect(
      resolveExistingFile(dir, [
        'wrangler.toml',
        'wrangler.jsonc',
        'wrangler.json',
      ]),
    ).toBe(join(dir, 'wrangler.json'));
  });

  it('returns null when no candidate exists', async () => {
    const dir = await tmp();
    expect(resolveExistingFile(dir, ['wrangler.toml', 'wrangler.json'])).toBe(
      null,
    );
  });
});
