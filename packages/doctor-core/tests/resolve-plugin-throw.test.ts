import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('node:url', async () => {
  const actual = await vi.importActual<typeof import('node:url')>('node:url');
  return {
    ...actual,
    fileURLToPath: () => {
      throw new Error('mocked: self-resolution disabled');
    },
  };
});

const {
  resolveNuxtDoctorPluginPath,
  resolveOxlintBin,
  resolveVueDoctorPluginPath,
} = await import('../src/oxlint/resolve-plugin.js');

async function tmp(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'geoql-doctor-throw-'));
}

describe('resolveVueDoctorPluginPath throw path', () => {
  it('throws when neither upward lookup nor self-resolution finds the plugin', async () => {
    const dir = await tmp();
    expect(() => resolveVueDoctorPluginPath(dir)).toThrow(
      /Failed to resolve @geoql\/oxlint-plugin-vue-doctor/,
    );
  });
});

describe('resolveNuxtDoctorPluginPath throw path', () => {
  it('throws when neither upward lookup nor self-resolution finds the plugin', async () => {
    const dir = await tmp();
    expect(() => resolveNuxtDoctorPluginPath(dir)).toThrow(
      /Failed to resolve @geoql\/oxlint-plugin-nuxt-doctor/,
    );
  });
});

describe('resolveOxlintBin throw path', () => {
  it('throws when neither upward lookup nor self-resolution finds oxlint', async () => {
    const dir = await tmp();
    expect(() => resolveOxlintBin(dir)).toThrow(/Failed to resolve oxlint/);
  });
});
