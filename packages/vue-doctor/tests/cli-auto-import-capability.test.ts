import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { run } from '../src/cli.js';

const RULE = 'vue-doctor/no-imports-from-vue-when-auto-imported';

describe('vue-doctor capability-gated oxlint rules (real oxlint subprocess)', () => {
  let stdout: string[];
  let dir: string;
  let savedCi: string | undefined;

  const write = (rel: string, content: string): void => {
    const parts = rel.split('/').slice(0, -1);
    if (parts.length > 0) mkdirSync(join(dir, ...parts), { recursive: true });
    writeFileSync(join(dir, rel), content);
  };

  const flagged = async (): Promise<string[]> => {
    stdout = [];
    await run(['node', 'vue-doctor', dir, '--json', '--no-dead-code']);
    const report = JSON.parse(stdout.join('')) as {
      diagnostics: { ruleId: string; file: string }[];
    };
    return report.diagnostics
      .filter((d) => d.ruleId === RULE)
      .map((d) => d.file);
  };

  beforeEach(() => {
    stdout = [];
    savedCi = process.env.GITHUB_ACTIONS;
    delete process.env.GITHUB_ACTIONS;
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      stdout.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    dir = mkdtempSync(join(tmpdir(), 'vue-doctor-auto-import-cap-'));
    write(
      'src/use-n.ts',
      "import { ref } from 'vue';\nexport const n = ref(1);\n",
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
    if (savedCi !== undefined) process.env.GITHUB_ACTIONS = savedCi;
    rmSync(dir, { recursive: true, force: true });
  });

  it('fires when the project auto-imports Vue (auto-imports:vue capability)', async () => {
    write(
      'package.json',
      JSON.stringify({
        name: 'v',
        dependencies: { vue: '^3.5.0' },
        devDependencies: { 'unplugin-auto-import': '^20.0.0' },
      }),
    );
    write(
      'vite.config.ts',
      "import AutoImport from 'unplugin-auto-import/vite';\nexport default { plugins: [AutoImport({ imports: ['vue'] })] };\n",
    );
    expect(await flagged()).toEqual(['src/use-n.ts']);
  });

  describe('test files', () => {
    const TEST_FILE = 'tests/unit/n.test.ts';
    const AUTO_IMPORT_VITE =
      "import AutoImport from 'unplugin-auto-import/vite';\nexport default { plugins: [AutoImport({ imports: ['vue'] })] };\n";

    beforeEach(() => {
      write(
        'package.json',
        JSON.stringify({
          name: 'v',
          dependencies: { vue: '^3.5.0' },
          devDependencies: {
            'unplugin-auto-import': '^20.0.0',
            vitest: '^4.0.0',
          },
        }),
      );
      write('vite.config.ts', AUTO_IMPORT_VITE);
      write(
        TEST_FILE,
        "import { ref } from 'vue';\nimport { expect, test } from 'vitest';\ntest('n', () => expect(ref(1).value).toBe(1));\n",
      );
    });

    it('skips test files when a standalone vitest config does not load AutoImport', async () => {
      write(
        'vitest.config.ts',
        "import { defineConfig } from 'vitest/config';\nexport default defineConfig({ test: { environment: 'node' } });\n",
      );
      expect(await flagged()).toEqual(['src/use-n.ts']);
    });

    it('flags test files when vitest falls back to the AutoImport vite.config', async () => {
      expect((await flagged()).sort()).toEqual(['src/use-n.ts', TEST_FILE]);
    });

    it('flags test files when vitest.config merges the AutoImport vite.config', async () => {
      write(
        'vitest.config.ts',
        "import { defineConfig, mergeConfig } from 'vitest/config';\nimport viteConfig from './vite.config';\nexport default mergeConfig(viteConfig, defineConfig({ test: {} }));\n",
      );
      expect((await flagged()).sort()).toEqual(['src/use-n.ts', TEST_FILE]);
    });

    it('flags test files when vitest.config loads AutoImport itself', async () => {
      write('vite.config.ts', 'export default {};\n');
      write('vitest.config.ts', AUTO_IMPORT_VITE);
      expect((await flagged()).sort()).toEqual(['src/use-n.ts', TEST_FILE]);
    });
  });

  it('does not fire when Vue is not auto-imported', async () => {
    write(
      'package.json',
      JSON.stringify({ name: 'v', dependencies: { vue: '^3.5.0' } }),
    );
    expect(await flagged()).toEqual([]);
  });
});
