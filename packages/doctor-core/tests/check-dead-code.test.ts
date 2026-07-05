import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DeadCodeImportFailed,
  DeadCodeTimeoutError,
} from '../src/dead-code/errors.js';
import type { ProjectInfo } from '../src/types/project-info.js';
import type { ResolvedDoctorConfig } from '../src/config/types.js';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(async () => {
    throw new Error('ENOENT');
  }),
  writeFile: vi.fn(async () => {}),
  mkdir: vi.fn(async () => undefined),
  unlink: vi.fn(async () => {}),
}));

const vueProjectInfo: ProjectInfo = {
  framework: 'vue',
  frameworkDetected: true,
  rootDirectory: '/project/vue-app',
  packageJsonPath: '/project/vue-app/package.json',
  vueVersion: '3.5.0',
  nuxtVersion: null,
  typescriptVersion: '6.0.0',
  hasAutoImports: false,
  hasComponentsAutoImport: false,
  hasPinia: false,
  hasVueRouter: false,
  nitroPreset: null,
  nuxtCompatibilityVersion: null,
  monorepoKind: null,
  capabilities: new Set(['vue:3', 'vue:3.5', 'typescript']),
};

const baseConfig: ResolvedDoctorConfig = {
  rootDir: '/project',
  include: [],
  exclude: [],
  failOn: 'error',
  threshold: 0,
  rules: {},
  source: 'built-in',
};

const mockKnipResult = {
  results: {
    issues: {
      files: {
        '/project/vue-app/src/old.ts': {
          old: { filePath: 'src/old.ts', symbol: 'old', type: 'files' },
        },
      },
      exports: {},
      types: {},
      deps: {},
      devDependencies: {},
      unlisted: {},
      duplicates: {},
      enumMembers: {},
      namespaceMembers: {},
      nsExports: {},
      nsTypes: {},
      optionalPeerDependencies: {},
      binaries: {},
      unresolved: {},
      catalog: {},
    },
  },
};

describe('checkDeadCode', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty array when enabled is false', async () => {
    const { checkDeadCode } = await import('../src/check-dead-code.js');
    const result = await checkDeadCode({
      projectInfo: vueProjectInfo,
      doctorConfig: baseConfig,
      enabled: false,
    });
    expect(result).toEqual([]);
  });

  it('maps knip issues to diagnostics when enabled', async () => {
    const mod = await import('../src/check-dead-code.js');
    const originalLoad = mod._knipLoader.load;
    mod._knipLoader.load = async () => ({
      createOptions: async () => ({ cwd: '/project/vue-app' }),
      run: async () => mockKnipResult,
    });

    try {
      const result = await mod.checkDeadCode({
        projectInfo: vueProjectInfo,
        doctorConfig: baseConfig,
        enabled: true,
      });

      expect(result.length).toBeGreaterThanOrEqual(1);
      const fileDiag = result.find((d) => d.ruleId === 'dead-code/unused-file');
      expect(fileDiag).toBeDefined();
      expect(fileDiag!.file).toBe(resolve('/project/vue-app', 'src/old.ts'));
      expect(fileDiag!.source).toBe('dead-code');
    } finally {
      mod._knipLoader.load = originalLoad;
    }
  });

  it('writes a knip config file and passes its path via args.config', async () => {
    const fsp = await import('node:fs/promises');
    const writeSpy = vi.mocked(fsp.writeFile);
    writeSpy.mockClear();

    const mod = await import('../src/check-dead-code.js');
    const originalLoad = mod._knipLoader.load;
    let capturedOptions: Record<string, unknown> | undefined;
    mod._knipLoader.load = async () => ({
      createOptions: async (opts: Record<string, unknown>) => {
        capturedOptions = opts;
        return { cwd: '/project/vue-app' };
      },
      run: async () => mockKnipResult,
    });

    try {
      await mod.checkDeadCode({
        projectInfo: {
          ...vueProjectInfo,
          hasAutoImports: true,
          hasComponentsAutoImport: true,
          hasVueRouter: true,
        },
        doctorConfig: baseConfig,
        enabled: true,
      });

      const args = capturedOptions?.args as { config?: string } | undefined;
      expect(args?.config).toContain('knip.json');
      expect(capturedOptions).not.toHaveProperty('entry');

      const written = writeSpy.mock.calls.find((c) =>
        String(c[0]).endsWith('knip.json'),
      );
      expect(written).toBeDefined();
      const json = JSON.parse(String(written![1])) as { entry: string[] };
      expect(json.entry).toContain('src/components/**/*.vue');
      expect(json.entry).toContain('src/composables/**/*.ts');
    } finally {
      mod._knipLoader.load = originalLoad;
    }
  });

  it('throws DeadCodeTimeoutError on timeout', async () => {
    vi.useFakeTimers();
    const mod = await import('../src/check-dead-code.js');
    const originalLoad = mod._knipLoader.load;
    mod._knipLoader.load = async () => ({
      createOptions: async () => ({ cwd: '/project/vue-app' }),
      run: () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(mockKnipResult), 600_000);
        }),
    });

    try {
      const promise = mod.checkDeadCode({
        projectInfo: vueProjectInfo,
        doctorConfig: baseConfig,
        enabled: true,
        timeoutMs: 50,
      });

      vi.advanceTimersByTime(100);
      vi.useRealTimers();

      await expect(promise).rejects.toThrow(DeadCodeTimeoutError);
    } finally {
      mod._knipLoader.load = originalLoad;
    }
  });

  it('throws DeadCodeImportFailed when knip import fails', async () => {
    const mod = await import('../src/check-dead-code.js');
    const originalLoad = mod._knipLoader.load;
    mod._knipLoader.load = async () => {
      throw new Error('Cannot find module knip');
    };

    try {
      await expect(
        mod.checkDeadCode({
          projectInfo: vueProjectInfo,
          doctorConfig: baseConfig,
          enabled: true,
        }),
      ).rejects.toThrow(DeadCodeImportFailed);
    } finally {
      mod._knipLoader.load = originalLoad;
    }
  });
});

describe('DeadCodeTimeoutError', () => {
  it('has correct name and message', () => {
    const err = new DeadCodeTimeoutError(5000);
    expect(err.name).toBe('DeadCodeTimeoutError');
    expect(err.message).toContain('5000');
  });
});

describe('DeadCodeImportFailed', () => {
  it('has correct name and wraps cause', () => {
    const cause = new Error('module not found');
    const err = new DeadCodeImportFailed(cause);
    expect(err.name).toBe('DeadCodeImportFailed');
    expect(err.cause).toBe(cause);
  });
});
