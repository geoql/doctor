import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import {
  analyzeViteConfig,
  parseViteAutoResolve,
  toEntryGlob,
} from '../../src/dead-code/parse-vite-auto-resolve.js';

const EXT = '{ts,tsx,js,jsx,mts,mjs,vue}';

describe('toEntryGlob', () => {
  it('turns a plain dir into a recursive source glob', () => {
    expect(toEntryGlob('./src/utils/')).toBe(`src/utils/**/*.${EXT}`);
  });

  it('normalizes trailing ** and * segments', () => {
    expect(toEntryGlob('src/composables/**')).toBe(
      `src/composables/**/*.${EXT}`,
    );
    expect(toEntryGlob('src/stores/*')).toBe(`src/stores/**/*.${EXT}`);
  });

  it('keeps globs that already name files', () => {
    expect(toEntryGlob('src/hooks/**/*.ts')).toBe('src/hooks/**/*.ts');
  });
});

describe('analyzeViteConfig', () => {
  it('returns nothing when no known plugin is imported', () => {
    const source = `import Vue from '@vitejs/plugin-vue';\nexport default { plugins: [Vue()] };`;
    expect(analyzeViteConfig(source)).toEqual({ entryDirs: [], packages: [] });
  });

  it('uses plugin default dirs when options are omitted', () => {
    const source = `
      import Components from 'unplugin-vue-components/vite';
      import VueRouter from 'vue-router/vite';
      import Pages from 'vite-plugin-pages';
      import Layouts from 'vite-plugin-vue-layouts-next';
      import AutoImport from 'unplugin-auto-import/vite';
      export default { plugins: [Components(), VueRouter({}), Pages(), Layouts(layoutOptions), AutoImport()] };
    `;
    expect(analyzeViteConfig(source)).toEqual({
      entryDirs: [
        `src/components/**/*.${EXT}`,
        `src/pages/**/*.${EXT}`,
        `src/layouts/**/*.${EXT}`,
      ],
      packages: [],
    });
  });

  it('reads configured dirs in every supported shape', () => {
    const source = `
      import { defineConfig } from 'vite';
      import Components from 'unplugin-vue-components/vite';
      import VueRouter from 'unplugin-vue-router/vite';
      import Pages from 'vite-plugin-pages';
      import Layouts from 'vite-plugin-vue-layouts';
      import AutoImport from 'unplugin-auto-import/vite';
      const extra = 'src/extra';
      export default defineConfig({
        plugins: [
          Components({ ...base, dirs: 'src/ui', dts: true }),
          VueRouter({ routesFolder: [{ src: 'src/views' }, 'src/admin', { path: 'x' }] }),
          Pages({ dirs: [{ dir: 'src/screens' }, null] }),
          Layouts({ 'layoutsDirs': ['src/shells'] }),
          AutoImport({ dirs: ['src/utils', '!src/utils/internal', extra, , { dir: 'x' }] }),
          other(),
          obj.method(),
        ],
      });
    `;
    expect(analyzeViteConfig(source).entryDirs).toEqual([
      `src/ui/**/*.${EXT}`,
      `src/views/**/*.${EXT}`,
      `src/admin/**/*.${EXT}`,
      `src/screens/**/*.${EXT}`,
      `src/shells/**/*.${EXT}`,
      `src/utils/**/*.${EXT}`,
    ]);
  });

  it('collects packages from AutoImport imports presets and maps', () => {
    const source = `
      import AutoImport from 'unplugin-auto-import/vite';
      import { VueRouterAutoImports } from 'unplugin-vue-router';
      const custom = { lib: ['x'] };
      export default {
        plugins: [
          AutoImport({
            imports: [
              'vue',
              'vue/macros',
              VueRouterAutoImports,
              custom,
              '@vueuse/core',
              { axios: [['default', 'axios']], '@scope/pkg/sub': ['y'], '@/local': ['z'], './rel': ['w'], ...spread },
              ,
              42,
            ],
          }),
        ],
      };
    `;
    expect(analyzeViteConfig(source).packages).toEqual([
      'vue',
      'vue-router',
      '@vueuse/core',
      'axios',
      '@scope/pkg',
    ]);
  });

  it('ignores imports that are not an array literal', () => {
    const source = `
      import AutoImport from 'unplugin-auto-import/vite';
      import Components from 'unplugin-vue-components/vite';
      const presets = ['pinia'];
      export default { plugins: [AutoImport({ imports: presets }), Components({ imports: ['pinia'] })] };
    `;
    expect(analyzeViteConfig(source).packages).toEqual([]);
  });
});

describe('parseViteAutoResolve', () => {
  it('returns empty when no vite config exists', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-vite-'));
    expect(await parseViteAutoResolve(dir)).toEqual({
      entryDirs: [],
      packages: [],
    });
  });

  it('reads the first vite config variant present', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-vite-'));
    await writeFile(
      join(dir, 'vite.config.mjs'),
      `import AutoImport from 'unplugin-auto-import/vite';\nexport default { plugins: [AutoImport({ imports: ['pinia'], dirs: ['src/utils'] })] };\n`,
    );
    expect(await parseViteAutoResolve(dir)).toEqual({
      entryDirs: [`src/utils/**/*.${EXT}`],
      packages: ['pinia'],
    });
  });
});
