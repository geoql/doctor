import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { loadAuditConfig } from '../src/config.js';

const dirs: string[] = [];

async function tmp(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-config-'));
  dirs.push(dir);
  return dir;
}

afterAll(() => {
  dirs.length = 0;
});

describe('loadAuditConfig', () => {
  it('returns defaults merged with rootDir when no config file exists', async () => {
    const root = await tmp();
    const loaded = await loadAuditConfig(root);
    expect(loaded.config.rootDir).toBe(root);
    expect(loaded.config.failOn).toBe('error');
    expect(loaded.config.include).toContain('**/*.vue');
    expect(loaded.config.exclude).toContain('node_modules');
  });

  it('applies overrides from a doctor.config.json file', async () => {
    const root = await tmp();
    await writeFile(
      join(root, 'doctor.config.json'),
      JSON.stringify({ failOn: 'warning', include: ['app/**/*.vue'] }),
    );
    const loaded = await loadAuditConfig(root);
    expect(loaded.config.rootDir).toBe(root);
    expect(loaded.config.failOn).toBe('warning');
    expect(loaded.config.include).toContain('app/**/*.vue');
    expect(loaded.configFile).toBeTruthy();
  });

  it('loads an explicitly provided config path', async () => {
    const root = await tmp();
    const explicit = join(root, 'custom.config.json');
    await writeFile(explicit, JSON.stringify({ failOn: 'warning' }));
    const loaded = await loadAuditConfig(root, explicit);
    expect(loaded.config.rootDir).toBe(root);
    expect(loaded.config.failOn).toBe('warning');
    expect(loaded.configFile).toBeTruthy();
  });
});
