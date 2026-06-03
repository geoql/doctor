import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  detectSummary,
  normalizeInitAnswers,
  parseExcludeList,
  planInit,
  renderDetectSummary,
} from '../src/init/index.js';
import type { ProjectInfo } from '../src/types/project-info.js';

function projectInfo(overrides: Partial<ProjectInfo> = {}): ProjectInfo {
  return {
    framework: 'vue',
    rootDirectory: '/proj',
    packageJsonPath: '/proj/package.json',
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
    nuxtConfigPath: null,
    hasAppDir: false,
    appDirPath: null,
    hasServerDir: false,
    hasPagesDir: false,
    hasWranglerConfig: false,
    capabilities: new Set<string>(['vue:3', 'typescript']),
    ...overrides,
  };
}

describe('parseExcludeList', () => {
  it('returns undefined for empty input', () => {
    expect(parseExcludeList(undefined)).toBeUndefined();
    expect(parseExcludeList('')).toBeUndefined();
  });

  it('splits a comma list and trims whitespace', () => {
    expect(parseExcludeList('dist/**, node_modules/** , .output/**')).toEqual([
      'dist/**',
      'node_modules/**',
      '.output/**',
    ]);
  });

  it('returns undefined when the list is only separators/whitespace', () => {
    expect(parseExcludeList('  , ,')).toBeUndefined();
  });
});

describe('normalizeInitAnswers', () => {
  it('falls back to ts/recommended when answers are empty (cancelled)', () => {
    expect(normalizeInitAnswers({})).toEqual({
      configFormat: 'ts',
      preset: 'recommended',
      threshold: undefined,
      exclude: undefined,
    });
  });

  it('maps every provided answer through', () => {
    expect(
      normalizeInitAnswers({
        target: 'package-json',
        preset: 'strict',
        threshold: 80,
        exclude: 'dist/**',
      }),
    ).toEqual({
      configFormat: 'package-json',
      preset: 'strict',
      threshold: 80,
      exclude: ['dist/**'],
    });
  });

  it('drops a non-numeric threshold', () => {
    expect(
      normalizeInitAnswers({ threshold: undefined, preset: 'minimal' })
        .threshold,
    ).toBeUndefined();
  });
});

describe('renderDetectSummary', () => {
  it('summarizes a Vue project with TS and SFC count', () => {
    expect(renderDetectSummary(projectInfo(), 3)).toBe(
      'detected: Vue 3.5.0 · TS · 3 SFCs',
    );
  });

  it('uses the singular SFC label for one file', () => {
    expect(renderDetectSummary(projectInfo(), 1)).toBe(
      'detected: Vue 3.5.0 · TS · 1 SFC',
    );
  });

  it('summarizes a Nuxt project', () => {
    expect(
      renderDetectSummary(
        projectInfo({ framework: 'nuxt', nuxtVersion: '4.0.0' }),
        2,
      ),
    ).toBe('detected: Nuxt 4.0.0 · TS · 2 SFCs');
  });

  it('renders "unknown" when the vue version is missing', () => {
    expect(renderDetectSummary(projectInfo({ vueVersion: null }), 0)).toBe(
      'detected: Vue unknown · TS · 0 SFCs',
    );
  });

  it('renders "unknown" when the nuxt version is missing', () => {
    expect(
      renderDetectSummary(
        projectInfo({ framework: 'nuxt', nuxtVersion: null }),
        0,
      ),
    ).toBe('detected: Nuxt unknown · TS · 0 SFCs');
  });

  it('labels an unknown framework and omits TS when absent', () => {
    expect(
      renderDetectSummary(
        projectInfo({
          framework: 'unknown',
          capabilities: new Set<string>(),
        }),
        0,
      ),
    ).toBe('detected: unknown project · 0 SFCs');
  });
});

describe('detectSummary', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'init-detect-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('reports an unknown project with zero SFCs for an empty directory', async () => {
    const summary = await detectSummary(dir);
    expect(summary).toBe('detected: unknown project · 0 SFCs');
  });

  it('counts .vue files in the target directory', async () => {
    writeFileSync(
      join(dir, 'package.json'),
      `${JSON.stringify({ dependencies: { vue: '3.5.0' } })}\n`,
    );
    writeFileSync(join(dir, 'App.vue'), '<template><div /></template>\n');
    const summary = await detectSummary(dir);
    expect(summary).toContain('Vue');
    expect(summary).toContain('1 SFC');
  });
});

describe('planInit', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'init-plan-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('omits exclude from the ts config when the array is empty', async () => {
    const plan = await planInit({
      dir,
      configFormat: 'ts',
      preset: 'recommended',
      threshold: undefined,
      exclude: [],
      binName: 'vue-doctor',
    });
    const config = plan.writes.find((w) => w.path.endsWith('doctor.config.ts'));
    expect(config?.content).not.toContain('exclude');
  });

  it('plans a doctor.config.ts plus a package.json doctor:check script', async () => {
    const plan = await planInit({
      dir,
      configFormat: 'ts',
      preset: 'recommended',
      threshold: undefined,
      exclude: undefined,
      binName: 'vue-doctor',
    });
    expect(plan.conflict).toBe(false);
    expect(plan.conflictPath).toBeNull();
    const config = plan.writes.find((w) => w.path.endsWith('doctor.config.ts'));
    expect(config?.content).toBe(
      "import { defineConfig } from '@geoql/doctor-core';\n\n" +
        'export default defineConfig({\n' +
        "  preset: 'recommended',\n" +
        '});\n',
    );
    const pkg = plan.writes.find((w) => w.path.endsWith('package.json'));
    const parsed = JSON.parse(pkg!.content) as {
      scripts: Record<string, string>;
    };
    expect(parsed.scripts['doctor:check']).toBe('vue-doctor');
  });

  it('embeds threshold and exclude in the ts config when provided', async () => {
    const plan = await planInit({
      dir,
      configFormat: 'ts',
      preset: 'strict',
      threshold: 80,
      exclude: ['dist/**', '.output/**'],
      binName: 'nuxt-doctor',
    });
    const config = plan.writes.find((w) => w.path.endsWith('doctor.config.ts'));
    expect(config?.content).toBe(
      "import { defineConfig } from '@geoql/doctor-core';\n\n" +
        'export default defineConfig({\n' +
        "  preset: 'strict',\n" +
        '  threshold: 80,\n' +
        "  exclude: ['dist/**', '.output/**'],\n" +
        '});\n',
    );
  });

  it('plans a JSON config when configFormat is json', async () => {
    const plan = await planInit({
      dir,
      configFormat: 'json',
      preset: 'recommended',
      threshold: 50,
      exclude: undefined,
      binName: 'vue-doctor',
    });
    const config = plan.writes.find((w) =>
      w.path.endsWith('doctor.config.json'),
    );
    expect(JSON.parse(config!.content)).toEqual({
      preset: 'recommended',
      threshold: 50,
    });
  });

  it('adds a doctor key to package.json when configFormat is package-json', async () => {
    writeFileSync(
      join(dir, 'package.json'),
      `${JSON.stringify({ name: 'demo', scripts: { build: 'x' } }, null, 2)}\n`,
    );
    const plan = await planInit({
      dir,
      configFormat: 'package-json',
      preset: 'recommended',
      threshold: undefined,
      exclude: undefined,
      binName: 'nuxt-doctor',
    });
    expect(plan.conflict).toBe(false);
    expect(plan.writes.some((w) => w.path.endsWith('doctor.config.ts'))).toBe(
      false,
    );
    const pkg = plan.writes.find((w) => w.path.endsWith('package.json'));
    const parsed = JSON.parse(pkg!.content) as {
      doctor: { preset: string };
      scripts: Record<string, string>;
    };
    expect(parsed.doctor).toEqual({ preset: 'recommended' });
    expect(parsed.scripts.build).toBe('x');
    expect(parsed.scripts['doctor:check']).toBe('nuxt-doctor');
  });

  it('flags a conflict when the ts config already exists', async () => {
    writeFileSync(join(dir, 'doctor.config.ts'), 'export default {};\n');
    const plan = await planInit({
      dir,
      configFormat: 'ts',
      preset: 'recommended',
      threshold: undefined,
      exclude: undefined,
      binName: 'vue-doctor',
    });
    expect(plan.conflict).toBe(true);
    expect(plan.conflictPath).toBe(join(dir, 'doctor.config.ts'));
  });

  it('flags a conflict when package.json already has a doctor key', async () => {
    writeFileSync(
      join(dir, 'package.json'),
      `${JSON.stringify({ doctor: { preset: 'minimal' } }, null, 2)}\n`,
    );
    const plan = await planInit({
      dir,
      configFormat: 'package-json',
      preset: 'recommended',
      threshold: undefined,
      exclude: undefined,
      binName: 'vue-doctor',
    });
    expect(plan.conflict).toBe(true);
    expect(plan.conflictPath).toBe(join(dir, 'package.json'));
  });
});
