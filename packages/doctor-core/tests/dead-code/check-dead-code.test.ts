import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  checkDeadCode,
  _knipLoader,
  DeadCodeImportFailed,
  DeadCodeTimeoutError,
} from '../../src/check-dead-code.js';
import type { ProjectInfo } from '../../src/types/project-info.js';
import type { ResolvedDoctorConfig } from '../../src/config/types.js';

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
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

const nuxtProjectInfo: ProjectInfo = {
  framework: 'nuxt',
  frameworkDetected: true,
  rootDirectory: '/project/nuxt-app',
  packageJsonPath: '/project/nuxt-app/package.json',
  vueVersion: null,
  nuxtVersion: '3.15.0',
  typescriptVersion: '6.0.0',
  hasAutoImports: true,
  hasComponentsAutoImport: true,
  hasPinia: true,
  hasVueRouter: true,
  nitroPreset: 'node-server',
  nuxtCompatibilityVersion: 3,
  monorepoKind: null,
  capabilities: new Set(['nuxt:3', 'nuxt:3.15', 'typescript']),
};

const baseConfig: ResolvedDoctorConfig = {
  rootDir: '/project',
  include: [],
  exclude: ['**/fixtures/**'],
  failOn: 'error',
  threshold: 0,
  rules: {},
  source: 'built-in',
};

const mockKnipIssues = {
  files: {},
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
};

describe('checkDeadCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns [] immediately when enabled is false without calling knip', async () => {
    const loadSpy = vi.spyOn(_knipLoader, 'load');
    const result = await checkDeadCode({
      projectInfo: vueProjectInfo,
      doctorConfig: baseConfig,
      enabled: false,
      timeoutMs: 5000,
    });
    expect(result).toEqual([]);
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('returns mapped diagnostics when knip returns issues', async () => {
    const mockRun = vi.fn().mockResolvedValue({
      results: {
        issues: {
          ...mockKnipIssues,
          exports: {
            'src/utils.ts': {
              formatDate: {
                filePath: 'src/utils.ts',
                symbol: 'formatDate',
                line: 5,
                col: 10,
                type: 'exports',
              },
            },
          },
        },
      },
    });

    vi.spyOn(_knipLoader, 'load').mockResolvedValue({
      createOptions: vi.fn().mockResolvedValue({}),
      run: mockRun,
    });

    const result = await checkDeadCode({
      projectInfo: vueProjectInfo,
      doctorConfig: baseConfig,
      enabled: true,
      timeoutMs: 30_000,
    });

    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('dead-code/unused-export');
    expect(result[0].severity).toBe('warn');
    expect(result[0].source).toBe('dead-code');
    expect(result[0].file).toContain('src/utils.ts');
  });

  it('throws DeadCodeImportFailed when knip import fails', async () => {
    vi.spyOn(_knipLoader, 'load').mockRejectedValue(
      new Error('module not found'),
    );

    await expect(
      checkDeadCode({
        projectInfo: vueProjectInfo,
        doctorConfig: baseConfig,
        enabled: true,
        timeoutMs: 30_000,
      }),
    ).rejects.toThrow(DeadCodeImportFailed);
  });

  it('throws DeadCodeTimeoutError when knip times out', async () => {
    vi.spyOn(_knipLoader, 'load').mockResolvedValue({
      createOptions: vi.fn().mockResolvedValue({}),
      run: vi.fn().mockImplementation(() => new Promise(() => {})),
    });

    await expect(
      checkDeadCode({
        projectInfo: vueProjectInfo,
        doctorConfig: baseConfig,
        enabled: true,
        timeoutMs: 50,
      }),
    ).rejects.toThrow(DeadCodeTimeoutError);
  });

  it('sorts diagnostics by file, line, ruleId', async () => {
    const mockRun = vi.fn().mockResolvedValue({
      results: {
        issues: {
          ...mockKnipIssues,
          files: {
            'src/b.ts': {
              _: { filePath: 'src/b.ts', symbol: '', type: 'files' },
            },
            'src/a.ts': {
              _: { filePath: 'src/a.ts', symbol: '', type: 'files' },
            },
          },
          exports: {
            'src/c.ts': {
              foo: { filePath: 'src/c.ts', symbol: 'foo', type: 'exports' },
            },
          },
        },
      },
    });

    vi.spyOn(_knipLoader, 'load').mockResolvedValue({
      createOptions: vi.fn().mockResolvedValue({}),
      run: mockRun,
    });

    const result = await checkDeadCode({
      projectInfo: vueProjectInfo,
      doctorConfig: baseConfig,
      enabled: true,
      timeoutMs: 30_000,
    });

    expect(result[0].file).toContain('src/a.ts');
    expect(result[1].file).toContain('src/b.ts');
    expect(result[2].file).toContain('src/c.ts');
  });

  it('sorts diagnostics by ruleId when file and line are equal', async () => {
    const mockRun = vi.fn().mockResolvedValue({
      results: {
        issues: {
          exports: {
            'src/shared.ts': {
              foo: {
                filePath: 'src/shared.ts',
                symbol: 'foo',
                type: 'exports',
                line: 5,
              },
            },
          },
          files: {
            'src/shared.ts': {
              _: {
                filePath: 'src/shared.ts',
                symbol: '',
                type: 'files',
                line: 5,
              },
            },
          },
          types: {},
          devDependencies: {},
          duplicates: {},
          enumMembers: {},
          namespaceMembers: {},
        },
      },
    });

    vi.spyOn(_knipLoader, 'load').mockResolvedValue({
      createOptions: vi.fn().mockResolvedValue({}),
      run: mockRun,
    });

    const result = await checkDeadCode({
      projectInfo: vueProjectInfo,
      doctorConfig: baseConfig,
      enabled: true,
      timeoutMs: 30_000,
    });

    expect(result).toHaveLength(2);
    expect(result[0].ruleId).toBe('dead-code/unused-export');
    expect(result[1].ruleId).toBe('dead-code/unused-file');
  });

  it('sorts diagnostics with ruleId tie-breaker in reverse order', async () => {
    const mockRun = vi.fn().mockResolvedValue({
      results: {
        issues: {
          files: {},
          exports: {},
          types: {
            'src/shared.ts': {
              SomeType: {
                filePath: 'src/shared.ts',
                symbol: 'SomeType',
                type: 'types',
                line: 5,
              },
            },
          },
          devDependencies: {},
          duplicates: {},
          enumMembers: {},
          namespaceMembers: {},
        },
      },
    });

    vi.spyOn(_knipLoader, 'load').mockResolvedValue({
      createOptions: vi.fn().mockResolvedValue({}),
      run: mockRun,
    });

    const result = await checkDeadCode({
      projectInfo: vueProjectInfo,
      doctorConfig: baseConfig,
      enabled: true,
      timeoutMs: 30_000,
    });

    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('dead-code/unused-type-export');
  });

  it('writes compilers into the knip config for nuxt framework', async () => {
    const fsp = await import('node:fs/promises');
    const writeSpy = vi.mocked(fsp.writeFile);
    writeSpy.mockClear();

    const mockRun = vi.fn().mockResolvedValue({
      results: { issues: mockKnipIssues },
    });
    const mockCreateOptions = vi.fn().mockResolvedValue({});

    vi.spyOn(_knipLoader, 'load').mockResolvedValue({
      createOptions: mockCreateOptions,
      run: mockRun,
    });

    await checkDeadCode({
      projectInfo: nuxtProjectInfo,
      doctorConfig: baseConfig,
      enabled: true,
      timeoutMs: 30_000,
    });

    const args = mockCreateOptions.mock.calls[0]?.[0] as {
      args?: { config?: string };
    };
    expect(args.args?.config).toContain('knip.json');

    const written = writeSpy.mock.calls.find((c) =>
      String(c[0]).endsWith('knip.json'),
    );
    const json = JSON.parse(String(written![1])) as {
      compilers?: { nuxt?: boolean };
    };
    expect(json.compilers).toEqual({ nuxt: true });
  });

  it('sorts diagnostics by line when file is same but line differs', async () => {
    const mockRun = vi.fn().mockResolvedValue({
      results: {
        issues: {
          exports: {
            'src/shared.ts': {
              bar: {
                filePath: 'src/shared.ts',
                symbol: 'bar',
                type: 'exports',
                line: 10,
              },
            },
          },
          files: {
            'src/shared.ts': {
              _: {
                filePath: 'src/shared.ts',
                symbol: '',
                type: 'files',
                line: 5,
              },
            },
          },
          types: {},
          devDependencies: {},
          duplicates: {},
          enumMembers: {},
          namespaceMembers: {},
        },
      },
    });

    vi.spyOn(_knipLoader, 'load').mockResolvedValue({
      createOptions: vi.fn().mockResolvedValue({}),
      run: mockRun,
    });

    const result = await checkDeadCode({
      projectInfo: vueProjectInfo,
      doctorConfig: baseConfig,
      enabled: true,
      timeoutMs: 30_000,
    });

    expect(result).toHaveLength(2);
    expect(result[0].line).toBe(5);
    expect(result[1].line).toBe(10);
  });
});
