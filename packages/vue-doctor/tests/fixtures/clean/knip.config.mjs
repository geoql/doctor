export default {
  entry: [
    'src/main.{ts,js}',
    'src/App.vue',
    'index.html',
    'vite.config.{ts,js}',
  ],
  project: [
    '**/*.{ts,vue}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/.nuxt/**',
  ],
  ignore: [
    'node_modules',
    'dist',
    '.nuxt',
    '.output',
    'coverage',
    'knip.config.mjs',
  ],
  ignoreDependencies: ['vite-plus', '@geoql/vue-doctor', '@geoql/nuxt-doctor'],
};
