import VueRouter from 'unplugin-vue-router/vite';
import { VueRouterAutoImports } from 'unplugin-vue-router';
import Layouts from 'vite-plugin-vue-layouts';
import Components from 'unplugin-vue-components/vite';
import AutoImport from 'unplugin-auto-import/vite';

export default {
  plugins: [
    VueRouter({ routesFolder: 'src/views' }),
    Layouts({ layoutsDirs: 'src/shells' }),
    Components({ dirs: ['src/ui'] }),
    AutoImport({
      imports: ['vue', VueRouterAutoImports, 'pinia', '@vueuse/core'],
      dirs: ['./src/composables', 'src/utils/**'],
    }),
  ],
};
