import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*', 'scripts'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: [
        'packages/*/src/**/*.d.ts',
        'packages/*/dist/**',
        // vscode-doctor is a thin VS Code extension — host-integration-tested,
        // not unit-tested (mirrors how packages/benchmark is excluded).
        'packages/vscode-doctor/**',
        // doctor-language-server's I/O shell: LSP connection wiring + process
        // spawn that can't be unit-tested cleanly. All pure logic (mapper,
        // positions, severity, group, scheduler, cache, selection, uri) lives
        // in sibling modules covered to 100%.
        'packages/doctor-language-server/src/server.ts',
      ],
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
