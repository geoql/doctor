import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateOxlintConfig } from '../src/oxlint/generate-config.js';

interface WrittenConfig {
  extends?: string[];
  plugins: string[];
  jsPlugins: string[];
  rules: Record<string, 'error' | 'warn'>;
}

async function readConfig(path: string): Promise<WrittenConfig> {
  return JSON.parse(await readFile(path, 'utf8')) as WrittenConfig;
}

async function projectDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'geoql-doctor-gc-root-'));
}

describe('generateOxlintConfig cache directory', () => {
  it('writes under node_modules/.cache/doctor when node_modules exists', async () => {
    const rootDir = await projectDir();
    await mkdir(join(rootDir, 'node_modules'));
    const { configPath, cleanup } = await generateOxlintConfig({
      pluginPath: '/p.js',
      rootDir,
    });
    expect(configPath).toContain(
      join('node_modules', '.cache', 'doctor', '.oxlintrc.json'),
    );
    expect(configPath.startsWith(rootDir)).toBe(true);
    await cleanup();
  });

  it('falls back to the system tmpdir when node_modules is absent', async () => {
    const rootDir = await projectDir();
    const { configPath, cleanup } = await generateOxlintConfig({
      pluginPath: '/p.js',
      rootDir,
    });
    expect(configPath.startsWith(rootDir)).toBe(false);
    expect(configPath.startsWith(tmpdir())).toBe(true);
    await cleanup();
  });

  it('falls back to the system tmpdir when no rootDir is given', async () => {
    const { configPath, cleanup } = await generateOxlintConfig({
      pluginPath: '/p.js',
    });
    expect(configPath.startsWith(tmpdir())).toBe(true);
    await cleanup();
  });
});

describe('generateOxlintConfig user config extends', () => {
  it('prepends an extends entry for an existing .oxlintrc.json', async () => {
    const rootDir = await projectDir();
    const userConfig = join(rootDir, '.oxlintrc.json');
    await writeFile(userConfig, '{}');
    const { configPath, cleanup } = await generateOxlintConfig({
      pluginPath: '/p.js',
      rootDir,
    });
    const cfg = await readConfig(configPath);
    expect(cfg.extends?.[0]).toBe(userConfig);
    await cleanup();
  });

  it('prepends an extends entry for an existing .oxlintrc', async () => {
    const rootDir = await projectDir();
    const userConfig = join(rootDir, '.oxlintrc');
    await writeFile(userConfig, '{}');
    const { configPath, cleanup } = await generateOxlintConfig({
      pluginPath: '/p.js',
      rootDir,
    });
    const cfg = await readConfig(configPath);
    expect(cfg.extends?.[0]).toBe(userConfig);
    await cleanup();
  });

  it('omits extends when no user config is present', async () => {
    const rootDir = await projectDir();
    const { configPath, cleanup } = await generateOxlintConfig({
      pluginPath: '/p.js',
      rootDir,
    });
    const cfg = await readConfig(configPath);
    expect('extends' in cfg).toBe(false);
    await cleanup();
  });
});

describe('generateOxlintConfig cleanup', () => {
  it('removes the written config file and is safe to call twice', async () => {
    const rootDir = await projectDir();
    await mkdir(join(rootDir, 'node_modules'));
    const { configPath, cleanup } = await generateOxlintConfig({
      pluginPath: '/p.js',
      rootDir,
    });
    expect(existsSync(configPath)).toBe(true);
    await cleanup();
    expect(existsSync(configPath)).toBe(false);
    await cleanup();
  });
});
