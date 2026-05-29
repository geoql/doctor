import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readPackageJson } from '../src/project-info/read-package-json.js';

async function tmp(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'geoql-doctor-pkgjson-'));
}

describe('readPackageJson', () => {
  it('parses a valid package.json into an object', async () => {
    const dir = await tmp();
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        dependencies: { vue: '^3.5.0' },
        devDependencies: { typescript: '^6.0.0' },
        engines: { node: '>=24' },
        workspaces: ['packages/*'],
      }),
    );
    const pkg = await readPackageJson(dir);
    expect(pkg).not.toBeNull();
    expect(pkg?.dependencies?.vue).toBe('^3.5.0');
    expect(pkg?.devDependencies?.typescript).toBe('^6.0.0');
    expect(pkg?.engines?.node).toBe('>=24');
    expect(pkg?.workspaces).toEqual(['packages/*']);
  });

  it('returns null when no package.json exists', async () => {
    const dir = await tmp();
    expect(await readPackageJson(dir)).toBeNull();
  });

  it('returns null when package.json is malformed JSON', async () => {
    const dir = await tmp();
    await writeFile(join(dir, 'package.json'), '{ not valid json');
    expect(await readPackageJson(dir)).toBeNull();
  });
});
