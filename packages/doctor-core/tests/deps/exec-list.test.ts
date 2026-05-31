import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { runPnpmList, runNpmList } from '../../src/deps/exec-list.js';

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

import { execFile } from 'node:child_process';

describe('exec-list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('runPnpmList', () => {
    it('returns versions when pnpm list succeeds', async () => {
      vi.mocked(execFile).mockImplementation(
        (
          _cmd: string,
          _args: string[],
          _options: unknown,
          callback: (
            error: Error | null,
            stdout: string,
            stderr: string,
          ) => void,
        ) => {
          const mockData = [
            {
              dependencies: { vue: { version: '3.5.0' } },
              devDependencies: {},
              peers: [],
            },
          ];
          callback(null, JSON.stringify(mockData), '');
          return {} as never;
        },
      );
      const result = await runPnpmList('/fake/path');
      expect(result.error).toBeNull();
      expect(result.versions).toContain('3.5.0');
    });

    it('returns error when pnpm list fails', async () => {
      vi.mocked(execFile).mockImplementation(
        (
          _cmd: string,
          _args: string[],
          _options: unknown,
          callback: (
            error: Error | null,
            stdout: string,
            stderr: string,
          ) => void,
        ) => {
          callback(new Error('pnpm not found'), '', 'pnpm not found');
          return {} as never;
        },
      );
      const result = await runPnpmList('/fake/path');
      expect(result.error).not.toBeNull();
      expect(result.versions).toEqual([]);
    });

    it('returns error when pnpm has stderr but no error object', async () => {
      vi.mocked(execFile).mockImplementation(
        (
          _cmd: string,
          _args: string[],
          _options: unknown,
          callback: (
            error: Error | null,
            stdout: string,
            stderr: string,
          ) => void,
        ) => {
          callback(null, '', 'pnpm error output');
          return {} as never;
        },
      );
      const result = await runPnpmList('/fake/path');
      expect(result.error).not.toBeNull();
      expect(result.versions).toEqual([]);
    });

    it('returns error on timeout', async () => {
      vi.useFakeTimers();
      try {
        vi.mocked(execFile).mockImplementation(
          (
            _cmd: string,
            _args: string[],
            _options: unknown,
            _cb: (error: Error | null, stdout: string, stderr: string) => void,
          ) => {
            return {} as never;
          },
        );
        const promise = runPnpmList('/fake/path');
        vi.advanceTimersByTime(11_000);
        const result = await promise;
        expect(result.error).not.toBeNull();
        expect(result.versions).toEqual([]);
      } finally {
        vi.useRealTimers();
      }
    });

    it('collects versions from peers', async () => {
      vi.mocked(execFile).mockImplementation(
        (
          _cmd: string,
          _args: string[],
          _options: unknown,
          callback: (
            error: Error | null,
            stdout: string,
            stderr: string,
          ) => void,
        ) => {
          const mockData = [
            {
              dependencies: {},
              devDependencies: {},
              peers: [{ name: 'vue', version: '3.6.0' }],
            },
          ];
          callback(null, JSON.stringify(mockData), '');
          return {} as never;
        },
      );
      const result = await runPnpmList('/fake/path');
      expect(result.versions).toContain('3.6.0');
    });

    it('returns error on invalid JSON', async () => {
      vi.mocked(execFile).mockImplementation(
        (
          _cmd: string,
          _args: string[],
          _options: unknown,
          callback: (
            error: Error | null,
            stdout: string,
            stderr: string,
          ) => void,
        ) => {
          callback(null, 'not json', '');
          return {} as never;
        },
      );
      const result = await runPnpmList('/fake/path');
      expect(result.error).not.toBeNull();
      expect(result.versions).toEqual([]);
    });
  });

  describe('runNpmList', () => {
    it('returns versions when npm ls succeeds', async () => {
      vi.mocked(execFile).mockImplementation(
        (
          _cmd: string,
          _args: string[],
          _options: unknown,
          callback: (
            error: Error | null,
            stdout: string,
            stderr: string,
          ) => void,
        ) => {
          const mockData = {
            dependencies: { vue: { version: '3.5.0' } },
            devDependencies: {},
            peers: [],
          };
          callback(null, JSON.stringify(mockData), '');
          return {} as never;
        },
      );
      const result = await runNpmList('/fake/path');
      expect(result.error).toBeNull();
      expect(result.versions).toContain('3.5.0');
    });

    it('returns error when npm ls fails', async () => {
      vi.mocked(execFile).mockImplementation(
        (
          _cmd: string,
          _args: string[],
          _options: unknown,
          callback: (
            error: Error | null,
            stdout: string,
            stderr: string,
          ) => void,
        ) => {
          callback(new Error('npm not found'), '', 'npm not found');
          return {} as never;
        },
      );
      const result = await runNpmList('/fake/path');
      expect(result.error).not.toBeNull();
      expect(result.versions).toEqual([]);
    });

    it('returns error when npm has stderr but no error object', async () => {
      vi.mocked(execFile).mockImplementation(
        (
          _cmd: string,
          _args: string[],
          _options: unknown,
          callback: (
            error: Error | null,
            stdout: string,
            stderr: string,
          ) => void,
        ) => {
          callback(null, '', 'npm error output');
          return {} as never;
        },
      );
      const result = await runNpmList('/fake/path');
      expect(result.error).not.toBeNull();
      expect(result.versions).toEqual([]);
    });

    it('returns error on timeout', async () => {
      vi.useFakeTimers();
      try {
        vi.mocked(execFile).mockImplementation(
          (
            _cmd: string,
            _args: string[],
            _options: unknown,
            _callback: (
              error: Error | null,
              stdout: string,
              stderr: string,
            ) => void,
          ) => {
            return {} as never;
          },
        );
        const promise = runNpmList('/fake/path');
        vi.advanceTimersByTime(11_000);
        const result = await promise;
        expect(result.error).not.toBeNull();
        expect(result.versions).toEqual([]);
      } finally {
        vi.useRealTimers();
      }
    });

    it('returns error on invalid JSON', async () => {
      vi.mocked(execFile).mockImplementation(
        (
          _cmd: string,
          _args: string[],
          _options: unknown,
          callback: (
            error: Error | null,
            stdout: string,
            stderr: string,
          ) => void,
        ) => {
          callback(null, 'not json', '');
          return {} as never;
        },
      );
      const result = await runNpmList('/fake/path');
      expect(result.error).not.toBeNull();
      expect(result.versions).toEqual([]);
    });

    it('collects versions from devDependencies', async () => {
      vi.mocked(execFile).mockImplementation(
        (
          _cmd: string,
          _args: string[],
          _options: unknown,
          callback: (
            error: Error | null,
            stdout: string,
            stderr: string,
          ) => void,
        ) => {
          const mockData = {
            dependencies: {},
            devDependencies: { vue: { version: '3.4.0' } },
            peers: [],
          };
          callback(null, JSON.stringify(mockData), '');
          return {} as never;
        },
      );
      const result = await runNpmList('/fake/path');
      expect(result.versions).toContain('3.4.0');
    });
  });

  it('collects versions from devDependencies in pnpm output', async () => {
    vi.mocked(execFile).mockImplementation(
      (
        _cmd: string,
        _args: string[],
        _options: unknown,
        callback: (error: Error | null, stdout: string, stderr: string) => void,
      ) => {
        const mockData = [
          {
            dependencies: {},
            devDependencies: { vue: { version: '3.4.0' } },
            peers: [],
          },
        ];
        callback(null, JSON.stringify(mockData), '');
        return {} as never;
      },
    );
    const result = await runPnpmList('/fake/path');
    expect(result.versions).toContain('3.4.0');
  });

  it('does not add vue when version is missing', async () => {
    vi.mocked(execFile).mockImplementation(
      (
        _cmd: string,
        _args: string[],
        _options: unknown,
        callback: (error: Error | null, stdout: string, stderr: string) => void,
      ) => {
        const mockData = [
          {
            dependencies: { vue: {} },
            devDependencies: { vue: { version: '' } },
            peers: [{ name: 'vue' }],
          },
        ];
        callback(null, JSON.stringify(mockData), '');
        return {} as never;
      },
    );
    const result = await runPnpmList('/fake/path');
    expect(result.versions).toEqual([]);
  });

  it('handles entries with missing properties', async () => {
    vi.mocked(execFile).mockImplementation(
      (
        _cmd: string,
        _args: string[],
        _options: unknown,
        callback: (error: Error | null, stdout: string, stderr: string) => void,
      ) => {
        const mockData = [
          {
            dependencies: { vue: { version: '3.5.0' } },
          },
          {
            devDependencies: { vue: { version: '3.4.0' } },
          },
          {
            peers: [{ name: 'vue', version: '3.3.0' }],
          },
        ];
        callback(null, JSON.stringify(mockData), '');
        return {} as never;
      },
    );
    const result = await runPnpmList('/fake/path');
    expect(result.versions).toContain('3.5.0');
    expect(result.versions).toContain('3.4.0');
    expect(result.versions).toContain('3.3.0');
  });
});
