import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCrossFilePass } from '../../../src/nuxt/cross-file/run.js';
import type { ProjectInfo } from '../../../src/types/project-info.js';

const SHARED_KEY_RULE = 'nuxt-doctor/data-fetching/no-shared-key-across-pages';
const SSR_RULE = 'nuxt-doctor/data-fetching/ssr-safe-onMounted-only-for-client';

function makeProject(rootDir: string): ProjectInfo {
  return {
    framework: 'nuxt',
    frameworkDetected: true,
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
  };
}

async function setupPages(
  pages: Record<string, string>,
): Promise<{ dir: string; files: string[] }> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-cf-'));
  await mkdir(join(dir, 'pages'), { recursive: true });
  await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
  const files: string[] = [];
  for (const [rel, content] of Object.entries(pages)) {
    const abs = join(dir, rel);
    const segs = rel.split('/').slice(0, -1);
    if (segs.length > 0)
      await mkdir(join(dir, segs.join('/')), { recursive: true });
    await writeFile(abs, content);
    files.push(abs);
  }
  return { dir, files };
}

describe('cross-file run.ts branch coverage', () => {
  it('skips a page that has no <script setup> block', async () => {
    const { dir, files } = await setupPages({
      'pages/static.vue': '<template><div>static</div></template>',
    });
    const diags = await runCrossFilePass({
      files,
      projectInfo: makeProject(dir),
    });
    expect(diags).toEqual([]);
  });

  it('returns [] when framework is not nuxt', async () => {
    const { dir, files } = await setupPages({
      'pages/index.vue': '<script setup lang="ts">const w = window.x;</script>',
    });
    const project = { ...makeProject(dir), framework: 'vue' as const };
    expect(await runCrossFilePass({ files, projectInfo: project })).toEqual([]);
  });

  it('returns [] when there are no page files', async () => {
    const { dir, files } = await setupPages({
      'app/components/Foo.vue':
        '<script setup lang="ts">const w = window.x;</script>',
    });
    expect(
      await runCrossFilePass({ files, projectInfo: makeProject(dir) }),
    ).toEqual([]);
  });

  it('extracts a template-literal key (single quasi) for shared-key detection', async () => {
    const { dir, files } = await setupPages({
      'pages/a.vue':
        '<script setup lang="ts">const { data } = await useAsyncData(`users`, () => $fetch("/a"));</script>',
      'pages/b.vue':
        '<script setup lang="ts">const { data } = await useFetch(`users`);</script>',
    });
    const diags = await runCrossFilePass({
      files,
      projectInfo: makeProject(dir),
    });
    const shared = diags.filter((d) => d.ruleId === SHARED_KEY_RULE);
    expect(shared.length).toBe(2);
  });

  it('extracts a useFetch options.key literal for shared-key detection', async () => {
    const { dir, files } = await setupPages({
      'pages/a.vue':
        '<script setup lang="ts">const { data } = await useFetch("/a", { key: "shared" });</script>',
      'pages/b.vue':
        '<script setup lang="ts">await useAsyncData("shared", () => $fetch("/b"));</script>',
    });
    const diags = await runCrossFilePass({
      files,
      projectInfo: makeProject(dir),
    });
    expect(diags.filter((d) => d.ruleId === SHARED_KEY_RULE).length).toBe(2);
  });

  it('does NOT report a key used in only one page', async () => {
    const { dir, files } = await setupPages({
      'pages/a.vue':
        '<script setup lang="ts">await useAsyncData("only-a", () => $fetch("/a"));</script>',
      'pages/b.vue':
        '<script setup lang="ts">await useAsyncData("only-b", () => $fetch("/b"));</script>',
    });
    const diags = await runCrossFilePass({
      files,
      projectInfo: makeProject(dir),
    });
    expect(diags.filter((d) => d.ruleId === SHARED_KEY_RULE)).toEqual([]);
  });

  it('skips watch / watchEffect call inits (not browser-global access)', async () => {
    const { dir, files } = await setupPages({
      'pages/index.vue':
        '<script setup lang="ts">const a = watch(x, () => {}); const b = watchEffect(() => {});</script>',
    });
    const diags = await runCrossFilePass({
      files,
      projectInfo: makeProject(dir),
    });
    expect(diags.filter((d) => d.ruleId === SSR_RULE)).toEqual([]);
  });

  it('skips watch / watchEffect as expression statements', async () => {
    const { dir, files } = await setupPages({
      'pages/index.vue':
        '<script setup lang="ts">watch(x, () => {});\nwatchEffect(() => {});</script>',
    });
    const diags = await runCrossFilePass({
      files,
      projectInfo: makeProject(dir),
    });
    expect(diags.filter((d) => d.ruleId === SSR_RULE)).toEqual([]);
  });

  it('fires on a top-level MemberExpression browser-global access in a var init', async () => {
    const { dir, files } = await setupPages({
      'pages/index.vue':
        '<script setup lang="ts">const t = document.title;</script>',
    });
    const diags = await runCrossFilePass({
      files,
      projectInfo: makeProject(dir),
    });
    expect(
      diags.filter((d) => d.ruleId === SSR_RULE).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('fires on a bare top-level MemberExpression statement (window.scrollY)', async () => {
    const { dir, files } = await setupPages({
      'pages/index.vue': '<script setup lang="ts">window.scrollY;</script>',
    });
    const diags = await runCrossFilePass({
      files,
      projectInfo: makeProject(dir),
    });
    expect(
      diags.filter((d) => d.ruleId === SSR_RULE).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('does NOT fire when the access is inside onMounted with a FunctionExpression body', async () => {
    const { dir, files } = await setupPages({
      'pages/index.vue':
        '<script setup lang="ts">onMounted(function () { const w = window.innerWidth; document.title = "x"; });</script>',
    });
    const diags = await runCrossFilePass({
      files,
      projectInfo: makeProject(dir),
    });
    expect(diags.filter((d) => d.ruleId === SSR_RULE)).toEqual([]);
  });

  it('does NOT fire for browser access nested deep inside onMounted', async () => {
    const { dir, files } = await setupPages({
      'pages/index.vue':
        '<script setup lang="ts">onMounted(() => { if (true) { for (const i of [1]) { const w = window.innerWidth; } } });</script>',
    });
    const diags = await runCrossFilePass({
      files,
      projectInfo: makeProject(dir),
    });
    expect(diags.filter((d) => d.ruleId === SSR_RULE)).toEqual([]);
  });

  it('ignores onMounted whose argument is not a function (no refs collected)', async () => {
    const { dir, files } = await setupPages({
      'pages/index.vue':
        '<script setup lang="ts">onMounted(someHandler);\nconst w = window.innerWidth;</script>',
    });
    const diags = await runCrossFilePass({
      files,
      projectInfo: makeProject(dir),
    });
    expect(
      diags.filter((d) => d.ruleId === SSR_RULE).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('skips a variable declarator that has no initializer', async () => {
    const { dir, files } = await setupPages({
      'pages/index.vue':
        '<script setup lang="ts">let x;\nconst w = window.innerWidth;</script>',
    });
    const diags = await runCrossFilePass({
      files,
      projectInfo: makeProject(dir),
    });
    expect(
      diags.filter((d) => d.ruleId === SSR_RULE).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('fires on a browser-global method call in a var initializer', async () => {
    const { dir, files } = await setupPages({
      'pages/index.vue':
        '<script setup lang="ts">const h = window.scrollY;\nconst r = document.querySelector("x");</script>',
    });
    const diags = await runCrossFilePass({
      files,
      projectInfo: makeProject(dir),
    });
    expect(
      diags.filter((d) => d.ruleId === SSR_RULE).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('fires on a bare browser-global method call expression statement', async () => {
    const { dir, files } = await setupPages({
      'pages/index.vue':
        '<script setup lang="ts">document.addEventListener("x", () => {});</script>',
    });
    const diags = await runCrossFilePass({
      files,
      projectInfo: makeProject(dir),
    });
    expect(
      diags.filter((d) => d.ruleId === SSR_RULE).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('treats onMounted via expression-statement with a function-expression arg as safe', async () => {
    const { dir, files } = await setupPages({
      'pages/index.vue':
        '<script setup lang="ts">onMounted(function () { document.title = "x"; window.scrollTo(0, 0); });</script>',
    });
    const diags = await runCrossFilePass({
      files,
      projectInfo: makeProject(dir),
    });
    expect(diags.filter((d) => d.ruleId === SSR_RULE)).toEqual([]);
  });

  it('ignores onMounted whose function arg has a non-block body (expression body)', async () => {
    const { dir, files } = await setupPages({
      'pages/index.vue':
        '<script setup lang="ts">onMounted(() => window.scrollTo(0, 0));\nconst w = window.innerWidth;</script>',
    });
    const diags = await runCrossFilePass({
      files,
      projectInfo: makeProject(dir),
    });
    expect(
      diags.filter((d) => d.ruleId === SSR_RULE).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('does not flag non-browser member access or calls', async () => {
    const { dir, files } = await setupPages({
      'pages/index.vue':
        '<script setup lang="ts">const a = config.value;\napi.fetchData();</script>',
    });
    const diags = await runCrossFilePass({
      files,
      projectInfo: makeProject(dir),
    });
    expect(diags.filter((d) => d.ruleId === SSR_RULE)).toEqual([]);
  });

  it('extracts a key from a NON-awaited useAsyncData var init (unwrapAwait passthrough)', async () => {
    const { dir, files } = await setupPages({
      'pages/a.vue':
        '<script setup lang="ts">const r = useAsyncData("plain", () => 1);</script>',
      'pages/b.vue':
        '<script setup lang="ts">const s = useFetch("plain");</script>',
    });
    const diags = await runCrossFilePass({
      files,
      projectInfo: makeProject(dir),
    });
    expect(diags.filter((d) => d.ruleId === SHARED_KEY_RULE).length).toBe(2);
  });

  it('ignores an empty template-literal key and useFetch opts without a string key', async () => {
    const { dir, files } = await setupPages({
      'pages/a.vue':
        '<script setup lang="ts">await useAsyncData(``, () => 1);</script>',
      'pages/b.vue':
        '<script setup lang="ts">await useFetch("/x", { method: "GET" });\nawait useFetch("/y", computed(() => 1));</script>',
    });
    const diags = await runCrossFilePass({
      files,
      projectInfo: makeProject(dir),
    });
    expect(diags.filter((d) => d.ruleId === SHARED_KEY_RULE)).toEqual([]);
  });

  it('does not report a key duplicated within a SINGLE page file', async () => {
    const { dir, files } = await setupPages({
      'pages/a.vue':
        '<script setup lang="ts">await useAsyncData("same", () => 1);\nawait useFetch("same");</script>',
    });
    const diags = await runCrossFilePass({
      files,
      projectInfo: makeProject(dir),
    });
    expect(diags.filter((d) => d.ruleId === SHARED_KEY_RULE)).toEqual([]);
  });

  it('skips a page whose descriptor fails to parse', async () => {
    const { dir, files } = await setupPages({
      'pages/broken.vue': '<script setup lang="ts">const a = window.x;',
    });
    const diags = await runCrossFilePass({
      files,
      projectInfo: makeProject(dir),
    });
    expect(Array.isArray(diags)).toBe(true);
  });

  it('handles a plain (no lang) <script setup> page (js branch in parse loop)', async () => {
    const { dir, files } = await setupPages({
      'pages/a.vue':
        '<script setup>await useAsyncData("jskey", () => 1);</script>',
      'pages/b.vue': '<script setup>await useFetch("jskey");</script>',
    });
    const diags = await runCrossFilePass({
      files,
      projectInfo: makeProject(dir),
    });
    expect(diags.filter((d) => d.ruleId === SHARED_KEY_RULE).length).toBe(2);
  });

  it('does not treat a member-call reactive wrapper (obj.watch()) as skipped', async () => {
    const { dir, files } = await setupPages({
      'pages/index.vue':
        '<script setup lang="ts">store.watch(() => {});\nconst w = window.innerWidth;</script>',
    });
    const diags = await runCrossFilePass({
      files,
      projectInfo: makeProject(dir),
    });
    expect(
      diags.filter((d) => d.ruleId === SSR_RULE).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('skips non-declaration/non-expression top-level statements during key extraction', async () => {
    const { dir, files } = await setupPages({
      'pages/a.vue':
        '<script setup lang="ts">if (x) { doThing(); }\nfor (const i of list) {}\nawait useAsyncData("kk", () => 1);</script>',
      'pages/b.vue': '<script setup lang="ts">await useFetch("kk");</script>',
    });
    const diags = await runCrossFilePass({
      files,
      projectInfo: makeProject(dir),
    });
    expect(diags.filter((d) => d.ruleId === SHARED_KEY_RULE).length).toBe(2);
  });

  it('ignores a bare literal/identifier expression statement in ssr scan', async () => {
    const { dir, files } = await setupPages({
      'pages/index.vue':
        '<script setup lang="ts">42;\nsomeVar;\nconst w = window.innerWidth;</script>',
    });
    const diags = await runCrossFilePass({
      files,
      projectInfo: makeProject(dir),
    });
    expect(
      diags.filter((d) => d.ruleId === SSR_RULE).length,
    ).toBeGreaterThanOrEqual(1);
  });
});
