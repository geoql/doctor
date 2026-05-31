import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  resolveNuxtDoctorPluginPath,
  resolveOxlintBin,
  resolveVueDoctorPluginPath,
} from '../src/oxlint/resolve-plugin.js';

const VUE_PLUGIN_REL = 'node_modules/@geoql/oxlint-plugin-vue-doctor';
const NUXT_PLUGIN_REL = 'node_modules/@geoql/oxlint-plugin-nuxt-doctor';

async function tmp(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'geoql-doctor-resolve-'));
}

async function writeVuePluginPkg(
  root: string,
  pkg: Record<string, unknown>,
): Promise<void> {
  const pkgDir = join(root, VUE_PLUGIN_REL);
  await mkdir(pkgDir, { recursive: true });
  await writeFile(join(pkgDir, 'package.json'), JSON.stringify(pkg));
}

async function writeNuxtPluginPkg(
  root: string,
  pkg: Record<string, unknown>,
): Promise<void> {
  const pkgDir = join(root, NUXT_PLUGIN_REL);
  await mkdir(pkgDir, { recursive: true });
  await writeFile(join(pkgDir, 'package.json'), JSON.stringify(pkg));
}

describe('resolveVueDoctorPluginPath upward lookup + readPkgMain', () => {
  it('resolves via exports["."].import', async () => {
    const root = await tmp();
    await writeVuePluginPkg(root, {
      exports: { '.': { import: './dist/x.js' } },
    });
    const resolved = resolveVueDoctorPluginPath(root);
    expect(resolved).toBe(join(root, VUE_PLUGIN_REL, 'dist/x.js'));
  });

  it('resolves via exports["."].default when no import', async () => {
    const root = await tmp();
    await writeVuePluginPkg(root, {
      exports: { '.': { default: './dist/def.js' } },
    });
    expect(resolveVueDoctorPluginPath(root)).toBe(
      join(root, VUE_PLUGIN_REL, 'dist/def.js'),
    );
  });

  it('resolves via top-level module field', async () => {
    const root = await tmp();
    await writeVuePluginPkg(root, { module: './dist/mod.js' });
    expect(resolveVueDoctorPluginPath(root)).toBe(
      join(root, VUE_PLUGIN_REL, 'dist/mod.js'),
    );
  });

  it('resolves via top-level main field', async () => {
    const root = await tmp();
    await writeVuePluginPkg(root, { main: './dist/main.js' });
    expect(resolveVueDoctorPluginPath(root)).toBe(
      join(root, VUE_PLUGIN_REL, 'dist/main.js'),
    );
  });

  it('falls back to ./dist/index.js when package.json has no entry fields', async () => {
    const root = await tmp();
    await writeVuePluginPkg(root, { name: '@geoql/oxlint-plugin-vue-doctor' });
    expect(resolveVueDoctorPluginPath(root)).toBe(
      join(root, VUE_PLUGIN_REL, 'dist/index.js'),
    );
  });

  it('falls back to ./dist/index.js when package.json is invalid JSON', async () => {
    const root = await tmp();
    const pkgDir = join(root, VUE_PLUGIN_REL);
    await mkdir(pkgDir, { recursive: true });
    await writeFile(join(pkgDir, 'package.json'), '{ not json');
    expect(resolveVueDoctorPluginPath(root)).toBe(
      join(pkgDir, 'dist/index.js'),
    );
  });

  it('finds the plugin in an ancestor directory', async () => {
    const root = await tmp();
    await writeVuePluginPkg(root, { main: './dist/main.js' });
    const deep = join(root, 'a', 'b', 'c');
    await mkdir(deep, { recursive: true });
    expect(resolveVueDoctorPluginPath(deep)).toBe(
      join(root, VUE_PLUGIN_REL, 'dist/main.js'),
    );
  });

  it('falls back to self-resolution when no node_modules copy exists', () => {
    const resolved = resolveVueDoctorPluginPath(dirname(tmpdir()));
    expect(resolved).toMatch(/oxlint-plugin-vue-doctor/);
  });
});

describe('resolveNuxtDoctorPluginPath upward lookup + readPkgMain', () => {
  it('resolves via exports["."].import', async () => {
    const root = await tmp();
    await writeNuxtPluginPkg(root, {
      exports: { '.': { import: './dist/x.js' } },
    });
    const resolved = resolveNuxtDoctorPluginPath(root);
    expect(resolved).toBe(join(root, NUXT_PLUGIN_REL, 'dist/x.js'));
  });

  it('resolves via exports["."].default when no import', async () => {
    const root = await tmp();
    await writeNuxtPluginPkg(root, {
      exports: { '.': { default: './dist/def.js' } },
    });
    expect(resolveNuxtDoctorPluginPath(root)).toBe(
      join(root, NUXT_PLUGIN_REL, 'dist/def.js'),
    );
  });

  it('resolves via top-level module field', async () => {
    const root = await tmp();
    await writeNuxtPluginPkg(root, { module: './dist/mod.js' });
    expect(resolveNuxtDoctorPluginPath(root)).toBe(
      join(root, NUXT_PLUGIN_REL, 'dist/mod.js'),
    );
  });

  it('resolves via top-level main field', async () => {
    const root = await tmp();
    await writeNuxtPluginPkg(root, { main: './dist/main.js' });
    expect(resolveNuxtDoctorPluginPath(root)).toBe(
      join(root, NUXT_PLUGIN_REL, 'dist/main.js'),
    );
  });

  it('falls back to ./dist/index.js when package.json has no entry fields', async () => {
    const root = await tmp();
    await writeNuxtPluginPkg(root, {
      name: '@geoql/oxlint-plugin-nuxt-doctor',
    });
    expect(resolveNuxtDoctorPluginPath(root)).toBe(
      join(root, NUXT_PLUGIN_REL, 'dist/index.js'),
    );
  });

  it('falls back to ./dist/index.js when package.json is invalid JSON', async () => {
    const root = await tmp();
    const pkgDir = join(root, NUXT_PLUGIN_REL);
    await mkdir(pkgDir, { recursive: true });
    await writeFile(join(pkgDir, 'package.json'), '{ not json');
    expect(resolveNuxtDoctorPluginPath(root)).toBe(
      join(pkgDir, 'dist/index.js'),
    );
  });

  it('finds the plugin in an ancestor directory', async () => {
    const root = await tmp();
    await writeNuxtPluginPkg(root, { main: './dist/main.js' });
    const deep = join(root, 'a', 'b', 'c');
    await mkdir(deep, { recursive: true });
    expect(resolveNuxtDoctorPluginPath(deep)).toBe(
      join(root, NUXT_PLUGIN_REL, 'dist/main.js'),
    );
  });

  it('falls back to self-resolution when no node_modules copy exists', () => {
    const resolved = resolveNuxtDoctorPluginPath(dirname(tmpdir()));
    expect(resolved).toMatch(/oxlint-plugin-nuxt-doctor/);
  });
});

describe('resolveOxlintBin', () => {
  it('finds oxlint/bin in an ancestor node_modules', async () => {
    const root = await tmp();
    const binDir = join(root, 'node_modules/oxlint');
    await mkdir(binDir, { recursive: true });
    await writeFile(
      join(binDir, 'package.json'),
      JSON.stringify({ name: 'oxlint' }),
    );
    const deep = join(root, 'a', 'b');
    await mkdir(deep, { recursive: true });
    expect(resolveOxlintBin(deep)).toBe(join(binDir, 'bin/oxlint'));
  });

  it('falls back to self-resolution when no node_modules copy exists', () => {
    const resolved = resolveOxlintBin(dirname(tmpdir()));
    expect(resolved).toMatch(/oxlint[/\\]bin[/\\]oxlint$/);
  });
});
