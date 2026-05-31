import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    plugins: ['typescript', 'vue', 'import'],
    ignorePatterns: [
      '.nuxt',
      '.output',
      'dist',
      'node_modules',
      '.wrangler',
      'coverage',
      '*.min.js',
      '*.min.css',
      'packages/*/dist',
      '**/tests/fixtures/**',
    ],
  },
  fmt: {
    printWidth: 80,
    semi: true,
    singleQuote: true,
    tabWidth: 2,
    trailingComma: 'all',
    bracketSpacing: true,
    arrowParens: 'always',
    endOfLine: 'lf',
    ignorePatterns: [
      '**/.nuxt/**',
      '**/.output/**',
      '**/dist/**',
      'node_modules',
      '**/.wrangler/**',
      '**/coverage/**',
      '*.min.js',
      '*.min.css',
      'pnpm-lock.yaml',
      '**/CHANGELOG.md',
      '**/jsr.json',
    ],
  },
});
