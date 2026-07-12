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
        // Re-export-only barrels and type-only modules: vitest 4.1.10's v8
        // remapping reports 0% for them even when a test imports them directly
        // and asserts on the re-exported symbols (proven via barrel-exports
        // tests). They contain no executable logic; export surfaces are
        // guarded by tests/barrel-exports.test.ts in each package.
        'packages/*/src/**/types.ts',
        'packages/doctor-core/src/types/project-info.ts',
        'packages/doctor-core/src/index.ts',
        'packages/doctor-core/src/config/index.ts',
        'packages/doctor-core/src/disables/index.ts',
        'packages/doctor-core/src/project-info/index.ts',
        'packages/vue-doctor/src/index.ts',
        'packages/doctor-rule-core/src/index.ts',
        'packages/doctor-rule-core/src/rules/index.ts',
        'packages/eslint-plugin-vue-doctor/src/index.ts',
        'packages/eslint-plugin-nuxt-doctor/src/index.ts',
        'packages/nuxt-doctor/src/index.ts',
        'packages/oxlint-plugin-vue-doctor/src/index.ts',
        'packages/oxlint-plugin-vue-doctor/src/define-rule.ts',
        'packages/oxlint-plugin-vue-doctor/src/rule-types.ts',
        'packages/oxlint-plugin-nuxt-doctor/src/index.ts',
        'packages/oxlint-plugin-nuxt-doctor/src/define-rule.ts',
        'packages/oxlint-plugin-nuxt-doctor/src/rule-types.ts',
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
