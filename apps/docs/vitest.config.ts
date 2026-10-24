import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite-plus';

// Unit tests for the docs app's pure modules (no Nuxt runtime). The root
// vitest config lists this directory as a project; the 100% coverage gate
// stays scoped to packages/*/src.
export default defineConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
    },
  },
  test: {
    name: 'docs',
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
