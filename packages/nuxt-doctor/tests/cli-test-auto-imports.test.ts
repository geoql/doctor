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

const RULE = 'nuxt-doctor/ai-slop/no-explicit-imports-of-auto-imported';
const TEST_FILE = 'tests/unit/table.test.ts';
const TEST_SOURCE =
  "import { ref } from 'vue';\nimport { expect, test } from 'vitest';\ntest('x', () => expect(ref(1).value).toBe(1));\n";

describe('nuxt-doctor no-explicit-imports-of-auto-imported in test files (#325)', () => {
  let stdout: string[];
  let dir: string;
  let savedCi: string | undefined;

  const write = (rel: string, content: string): void => {
    const parts = rel.split('/').slice(0, -1);
    if (parts.length > 0) mkdirSync(join(dir, ...parts), { recursive: true });
    writeFileSync(join(dir, rel), content);
  };

  const flaggedFiles = async (): Promise<string[]> => {
    stdout = [];
    await run(['node', 'nuxt-doctor', dir, '--json', '--no-dead-code']);
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
    dir = mkdtempSync(join(tmpdir(), 'nuxt-doctor-test-auto-imports-'));
    write(
      'package.json',
      JSON.stringify({
        name: 'x',
        dependencies: { nuxt: '^4.0.0', vue: '^3.5.0' },
        devDependencies: { vitest: '^4.0.0' },
      }),
    );
    write('nuxt.config.ts', 'export default defineNuxtConfig({});\n');
    write('app/app.vue', '<template><div /></template>\n');
    write(TEST_FILE, TEST_SOURCE);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = undefined;
    if (savedCi !== undefined) process.env.GITHUB_ACTIONS = savedCi;
    rmSync(dir, { recursive: true, force: true });
  });

  it('does not flag a plain vitest test, which has no Nuxt auto-imports', async () => {
    write(
      'vitest.config.ts',
      "import { defineConfig } from 'vitest/config';\nexport default defineConfig({ test: { environment: 'node' } });\n",
    );
    expect(await flaggedFiles()).toEqual([]);
  });

  it('reports a Vue import in Nuxt once, under the Nuxt rule only', async () => {
    write(
      'app/composables/useX.ts',
      "import { ref } from 'vue';\nexport const useX = () => ref(1);\n",
    );
    stdout = [];
    await run(['node', 'nuxt-doctor', dir, '--json', '--no-dead-code']);
    const report = JSON.parse(stdout.join('')) as {
      diagnostics: { ruleId: string; file: string }[];
    };
    const vueRule = report.diagnostics.filter(
      (d) => d.ruleId === 'vue-doctor/no-imports-from-vue-when-auto-imported',
    );
    expect(vueRule).toEqual([]);
    const nuxtRule = report.diagnostics.filter((d) => d.ruleId === RULE);
    expect(nuxtRule.map((d) => d.file)).toEqual(['app/composables/useX.ts']);
  });

  it('still flags app source in the same project', async () => {
    write(
      'app/composables/useX.ts',
      "import { ref } from 'vue';\nexport const useX = () => ref(1);\n",
    );
    expect(await flaggedFiles()).toEqual(['app/composables/useX.ts']);
  });

  it('flags test files when vitest runs them in the Nuxt environment', async () => {
    write(
      'vitest.config.ts',
      "import { defineVitestConfig } from '@nuxt/test-utils/config';\nexport default defineVitestConfig({ test: { environment: 'nuxt' } });\n",
    );
    expect(await flaggedFiles()).toEqual([TEST_FILE]);
  });

  it('flags a test file that opts into the Nuxt environment with a pragma', async () => {
    // Split so vitest does not read the pragma as this file's own environment.
    const pragma = ['// @vitest', 'environment nuxt'].join('-');
    write(TEST_FILE, `${pragma}\n${TEST_SOURCE}`);
    expect(await flaggedFiles()).toEqual([TEST_FILE]);
  });
});
