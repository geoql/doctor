import { describe, expect, it } from 'vitest';
import { isTestSurfacePath } from '../src/test-surface.js';

describe('isTestSurfacePath', () => {
  it.each([
    'src/utils/date.test.ts',
    'src/utils/date.spec.ts',
    'app/components/Button.stories.ts',
    'app/components/Button.cy.ts',
    'tests/server/repository.test.ts',
    'tests/helpers/db.ts',
    'test/fixture.ts',
    'src/__tests__/helper.ts',
    'src/__mocks__/fetch.ts',
    'e2e/login.spec.ts',
    'cypress/support/commands.ts',
    'playwright/auth.setup.ts',
  ])('classifies %s as test surface', (path) => {
    expect(isTestSurfacePath(path)).toBe(true);
  });

  it.each([
    'src/App.vue',
    'app/composables/use-projects.ts',
    'server/utils/score/repository.ts',
    // Prod routes named test/tests stay prod (react-doctor #1377 semantics).
    'app/pages/test.vue',
    'app/pages/tests/index.vue',
    'pages/test.vue',
    'server/routes/test.get.ts',
    'server/api/tests.get.ts',
    'layouts/test.vue',
    // "test" merely inside a word is not a test surface.
    'src/contest/winner.ts',
    'app/utils/latest.ts',
  ])('classifies %s as prod surface', (path) => {
    expect(isTestSurfacePath(path)).toBe(false);
  });

  it('handles absolute-style and backslash paths', () => {
    expect(isTestSurfacePath('/repo/tests/unit/a.ts')).toBe(true);
    expect(isTestSurfacePath('src\\utils\\date.test.ts')).toBe(true);
    expect(isTestSurfacePath('app\\pages\\tests\\index.vue')).toBe(false);
  });
});
