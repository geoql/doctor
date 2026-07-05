import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkBuildQuality } from '../src/check-build-quality.js';
import type { Framework, ProjectInfo } from '../src/types/project-info.js';

async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-bq-orch-'));
  for (const [name, content] of Object.entries(files)) {
    const filePath = join(dir, name);
    await mkdir(join(dir, name.split('/').slice(0, -1).join('/') || '.'), {
      recursive: true,
    });
    await writeFile(filePath, content);
  }
  return dir;
}

function makeProjectInfo(
  rootDirectory: string,
  overrides: { framework?: Framework; packageJsonPath?: string | null } = {},
): ProjectInfo {
  const framework = overrides.framework ?? 'vue';
  return {
    framework,
    frameworkDetected: framework === 'vue' || framework === 'nuxt',
    rootDirectory,
    packageJsonPath:
      overrides.packageJsonPath === undefined
        ? join(rootDirectory, 'package.json')
        : overrides.packageJsonPath,
    vueVersion: null,
    nuxtVersion: null,
    typescriptVersion: null,
    hasAutoImports: false,
    hasComponentsAutoImport: false,
    hasPinia: false,
    hasVueRouter: false,
    nitroPreset: null,
    nuxtCompatibilityVersion: null,
    monorepoKind: null,
    capabilities: new Set(),
  };
}

describe('checkBuildQuality', () => {
  it('aggregates diagnostics from all four checks on a triggering fixture', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        devDependencies: { '@vue/cli-service': '^5.0.0' },
      }),
      'tsconfig.json': '{"compilerOptions":{"strict":false}}',
    });
    const diagnostics = await checkBuildQuality(
      makeProjectInfo(dir, { framework: 'vue' }),
    );
    const ruleIds = diagnostics.map((d) => d.ruleId);
    expect(ruleIds).toContain(
      'vue-doctor/build-quality/tsconfig-strict-required',
    );
    expect(ruleIds).toContain('vue-doctor/build-quality/vue-tsc-in-devDeps');
    expect(ruleIds).toContain('vue-doctor/build-quality/no-vue-cli');
    expect(ruleIds).toContain(
      'vue-doctor/build-quality/eslint-plugin-vue-installed',
    );
    for (const d of diagnostics) {
      expect(d.source).toBe('project');
      expect(d.file).toMatch(/(package\.json|tsconfig\.json)$/);
    }
  });

  it('returns [] when packageJsonPath is null', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    const diagnostics = await checkBuildQuality(
      makeProjectInfo(dir, { framework: 'vue', packageJsonPath: null }),
    );
    expect(diagnostics).toEqual([]);
  });

  it('returns [] for a complete, modern vue project', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'x',
        devDependencies: {
          'vue-tsc': '^2.0.0',
          'eslint-plugin-vue': '^9.0.0',
          vite: '^6.0.0',
        },
      }),
      'tsconfig.json': '{"compilerOptions":{"strict":true}}',
    });
    const diagnostics = await checkBuildQuality(
      makeProjectInfo(dir, { framework: 'vue' }),
    );
    expect(diagnostics).toEqual([]);
  });
});
