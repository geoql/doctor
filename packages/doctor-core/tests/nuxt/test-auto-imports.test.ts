import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import {
  dropAutoImportFindingsInPlainTests,
  usesNuxtVitestEnvironment,
} from '../../src/nuxt/test-auto-imports.js';
import type { Diagnostic } from '../../src/types.js';

const RULE = 'nuxt-doctor/ai-slop/no-explicit-imports-of-auto-imported';
// Split so vitest does not read the pragma as this file's own environment.
const PRAGMA = ['// @vitest', 'environment nuxt'].join('-');

async function project(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'geoql-doctor-test-ai-'));
  for (const [rel, content] of Object.entries(files)) {
    const parts = rel.split('/').slice(0, -1);
    if (parts.length > 0)
      await mkdir(join(root, parts.join('/')), { recursive: true });
    await writeFile(join(root, rel), content);
  }
  return root;
}

function diag(file: string, ruleId = RULE): Diagnostic {
  return {
    file,
    line: 1,
    column: 1,
    ruleId,
    severity: 'warn',
    message: 'm',
    source: 'oxlint',
  };
}

describe('usesNuxtVitestEnvironment', () => {
  it.each([
    [
      'vitest.config.ts',
      "import { defineVitestConfig } from '@nuxt/test-utils/config';",
      true,
    ],
    ['vitest.config.mts', "test: { environment: 'nuxt' }", true],
    ['vitest.workspace.json', '[{ "test": { "environment": "nuxt" } }]', true],
    ['vitest.config.ts', "test: { environment: 'node' }", false],
  ])('%s with %s → %s', async (name, content, expected) => {
    const root = await project({ [name]: content });
    expect(await usesNuxtVitestEnvironment(root)).toBe(expected);
  });

  it('is false without a vitest config', async () => {
    expect(await usesNuxtVitestEnvironment(await project({}))).toBe(false);
  });
});

describe('dropAutoImportFindingsInPlainTests', () => {
  it('drops the finding in plain test files and keeps everything else', async () => {
    const root = await project({
      'tests/unit/a.test.ts': "import { ref } from 'vue';",
      'tests/unit/nuxt.test.ts': `${PRAGMA}\nimport { ref } from 'vue';`,
      'app/useX.ts': "import { ref } from 'vue';",
    });
    const plain = diag(join(root, 'tests/unit/a.test.ts'));
    const pragma = diag('tests/unit/nuxt.test.ts');
    const missing = diag('tests/unit/gone.test.ts');
    const app = diag(join(root, 'app/useX.ts'));
    const otherRule = diag('tests/unit/a.test.ts', 'vue-doctor/x');
    const out = await dropAutoImportFindingsInPlainTests(
      [plain, pragma, missing, app, otherRule],
      root,
    );
    expect(out).toEqual([pragma, app, otherRule]);
  });

  it('keeps test findings when vitest runs in the Nuxt environment', async () => {
    const root = await project({
      'vitest.config.ts': 'export default defineVitestConfig({});',
    });
    const findings = [diag('tests/a.test.ts')];
    expect(await dropAutoImportFindingsInPlainTests(findings, root)).toBe(
      findings,
    );
  });

  it('returns the input untouched when no test file carries the finding', async () => {
    const findings = [diag('app/a.ts')];
    expect(
      await dropAutoImportFindingsInPlainTests(findings, await project({})),
    ).toBe(findings);
  });
});
