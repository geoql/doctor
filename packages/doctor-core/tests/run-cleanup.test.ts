import { beforeEach, describe, expect, it, vi } from 'vitest';

const cleanup = vi.fn(async () => {});
const runOxlintMock = vi.fn();

vi.mock('../src/oxlint/resolve-plugin.js', () => ({
  resolveVueDoctorPluginPath: () => '/plugin.js',
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
});

describe('runScriptPass cleanup', () => {
  it('calls cleanup after a successful run', async () => {
    runOxlintMock.mockResolvedValue({
      diagnostics: [],
      stderr: '',
      exitCode: 0,
    });
    const result = await runScriptPass({
      rootDir: '/root',
      targetPath: '/root',
    });
    expect(result.diagnostics).toEqual([]);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('calls cleanup and rethrows when runOxlint throws', async () => {
    runOxlintMock.mockRejectedValue(new Error('spawn exploded'));
    await expect(
      runScriptPass({ rootDir: '/root', targetPath: '/root' }),
    ).rejects.toThrow('spawn exploded');
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
