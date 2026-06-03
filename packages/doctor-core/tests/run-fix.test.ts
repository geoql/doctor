import { beforeEach, describe, expect, it, vi } from 'vitest';

const cleanup = vi.fn(async () => {});
const runOxlintMock = vi.fn();

vi.mock('../src/oxlint/resolve-plugin.js', () => ({
  resolveNuxtDoctorPluginPath: () => '/nuxt-plugin.js',
  resolveVueDoctorPluginPath: () => '/vue-plugin.js',
  resolveOxlintBin: () => '/bin/oxlint',
}));

vi.mock('../src/oxlint/generate-config.js', () => ({
  generateOxlintConfig: vi.fn(async () => ({
    configPath: '/cfg/.oxlintrc.json',
    cleanup,
  })),
}));

vi.mock('../src/oxlint/spawn.js', () => ({
  runOxlint: runOxlintMock,
}));

const { runScriptPass } = await import('../src/oxlint/run.js');

beforeEach(() => {
  cleanup.mockClear();
  runOxlintMock.mockReset();
  runOxlintMock.mockResolvedValue({ diagnostics: [], stderr: '', exitCode: 0 });
});

describe('runScriptPass fix threading', () => {
  it('passes fix:true through to runOxlint', async () => {
    await runScriptPass({ rootDir: '/root', targetPath: '/root', fix: true });
    expect(runOxlintMock.mock.calls[0]![0].fix).toBe(true);
  });

  it('does not pass fix when fix is unset', async () => {
    await runScriptPass({ rootDir: '/root', targetPath: '/root' });
    expect(runOxlintMock.mock.calls[0]![0].fix).toBeFalsy();
  });
});
