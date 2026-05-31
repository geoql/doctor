import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSfcDescriptorCache } from '../../../../src/sfc/parse-sfc-descriptor.js';
import { check } from '../../../../src/sfc/rules/nuxt/no-mixed-app-and-root-layout.js';
import type { SfcRuleContext } from '../../../../src/sfc/rules/types.js';
import type { ProjectInfo } from '../../../../src/types/project-info.js';

const RULE_ID = 'nuxt-doctor/ai-slop/no-mixed-app-and-root-layout';

async function layoutFixture(
  relPath: string,
  content: string,
  projectOverrides: Partial<ProjectInfo> = {},
): Promise<{ path: string; ctx: SfcRuleContext }> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-layout-'));
  const path = join(dir, relPath);
  const segments = relPath.split('/').slice(0, -1);
  if (segments.length > 0) {
    await mkdir(join(dir, segments.join('/')), { recursive: true });
  }
  await writeFile(path, content);
  const { parseSfcDescriptor: parse } =
    await import('../../../../src/sfc/parse-sfc-descriptor.js');
  const descriptor = await parse(path);
  if (!descriptor) throw new Error('parse failed: ' + path);
  const rootDir = dir;
  const { relative } = await import('node:path');
  const relativePath = relative(rootDir, path).replace(/\\/g, '/');
  const projectInfo: ProjectInfo = {
    framework: 'nuxt',
    rootDirectory: rootDir,
    packageJsonPath: join(rootDir, 'package.json'),
    vueVersion: '3.5.0',
    nuxtVersion: '4.4.0',
    typescriptVersion: '6.0.3',
    hasAutoImports: true,
    hasComponentsAutoImport: true,
    hasPinia: false,
    hasVueRouter: true,
    nitroPreset: null,
    nuxtCompatibilityVersion: 4,
    monorepoKind: null,
    nuxtConfigPath: join(rootDir, 'nuxt.config.ts'),
    hasAppDir: true,
    appDirPath: join(rootDir, 'app'),
    hasServerDir: false,
    hasPagesDir: true,
    hasWranglerConfig: false,
    capabilities: new Set(['nuxt4', 'pages-dir']),
    ...projectOverrides,
  };
  return {
    path,
    ctx: {
      file: path,
      descriptor,
      rootDirectory: rootDir,
      relativePath,
      projectInfo,
    },
  };
}

beforeEach(() => {
  clearSfcDescriptorCache();
});

describe('no-mixed-app-and-root-layout — fires', () => {
  it('warns when a layout file renders NuxtLayout inside itself', async () => {
    const { ctx } = await layoutFixture(
      'layouts/default.vue',
      '<template><NuxtLayout><slot /></NuxtLayout></template>\n<script setup lang="ts"></script>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(1);
    expect(diags[0]?.ruleId).toBe(RULE_ID);
    expect(diags[0]?.severity).toBe('warn');
    expect(diags[0]?.source).toBe('sfc');
    expect(diags[0]?.message).toContain('NuxtLayout');
  });

  it('warns for app/layouts/nested/admin.vue that renders NuxtLayout', async () => {
    const { ctx } = await layoutFixture(
      'app/layouts/nested/admin.vue',
      '<template><div><NuxtLayout /></div></template>\n<script setup lang="ts"></script>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(1);
    expect(diags[0]?.ruleId).toBe(RULE_ID);
  });
});

describe('no-mixed-app-and-root-layout — does not fire', () => {
  it('does not fire on a layout that only uses slot', async () => {
    const { ctx } = await layoutFixture(
      'layouts/default.vue',
      '<template><slot /></template>\n<script setup lang="ts"></script>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(0);
  });

  it('does not fire on a page file', async () => {
    const { ctx } = await layoutFixture(
      'pages/index.vue',
      '<template><div>home</div></template>\n<script setup lang="ts"></script>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(0);
  });

  it('does not fire on a component that uses NuxtLayout', async () => {
    const { ctx } = await layoutFixture(
      'components/MyLayout.vue',
      '<template><NuxtLayout><slot /></NuxtLayout></template>\n<script setup lang="ts"></script>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(0);
  });

  it('does not fire when template is absent', async () => {
    const { ctx } = await layoutFixture(
      'layouts/default.vue',
      '<script setup lang="ts">const x = 1;</script>',
    );
    const diags = check(ctx).diagnostics;
    expect(diags).toHaveLength(0);
  });
});
