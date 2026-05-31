import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    entry: ['src/index.ts'],
    format: ['esm'],
    platform: 'neutral',
    sourcemap: true,
    dts: true,
    deps: {
      neverBundle: [
        '@geoql/doctor-core',
        '@geoql/oxlint-plugin-nuxt-doctor',
        '@geoql/oxlint-plugin-vue-doctor',
        'cac',
        'kolorist',
        'oxlint',
        /^node:/,
      ],
    },
  },
  lint: {
    plugins: ['typescript', 'import'],
    ignorePatterns: ['dist', 'node_modules', 'coverage', 'tests/fixtures'],
  },
  fmt: {
    printWidth: 100,
    semi: true,
    singleQuote: true,
    tabWidth: 2,
    trailingComma: 'all',
    bracketSpacing: true,
    arrowParens: 'always',
    endOfLine: 'lf',
    ignorePatterns: ['dist', 'node_modules', 'coverage', 'pnpm-lock.yaml'],
  },
});
