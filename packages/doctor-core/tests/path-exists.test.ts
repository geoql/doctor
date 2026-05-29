import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pathExists } from '../src/project-info/path-exists.js';

async function tmp(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'geoql-doctor-exists-'));
}

describe('pathExists', () => {
  it('returns true for an existing file', async () => {
    const dir = await tmp();
    const file = join(dir, 'present.txt');
    await writeFile(file, 'x');
    expect(await pathExists(file)).toBe(true);
  });

  it('returns false for a missing path', async () => {
    const dir = await tmp();
    expect(await pathExists(join(dir, 'absent.txt'))).toBe(false);
  });
});
