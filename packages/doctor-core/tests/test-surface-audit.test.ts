import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { audit } from '../src/audit.js';

const root = mkdtempSync(join(tmpdir(), 'dc-test-surface-'));

// `v-for` without `:key` fires vue-doctor/template/v-for-has-key (error).
const VIOLATION = '<template><li v-for="i in items">{{ i }}</li></template>\n';

function scaffold(): string {
  const dir = join(root, 'project');
  mkdirSync(join(dir, 'src'), { recursive: true });
  mkdirSync(join(dir, 'tests'), { recursive: true });
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'fx', dependencies: { vue: '^3.5.0' } }),
  );
  writeFileSync(join(dir, 'src', 'App.vue'), VIOLATION);
  writeFileSync(join(dir, 'tests', 'App.test.vue'), VIOLATION);
  return dir;
}

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('audit — test-surface scoring', () => {
  it('reports test findings but excludes them from the score by default', async () => {
    const dir = scaffold();
    const report = await audit({
      rootDir: dir,
      deadCode: false,
    });

    const prod = report.diagnostics.filter((d) => d.surface !== 'test');
    const tests = report.diagnostics.filter((d) => d.surface === 'test');

    expect(prod.length).toBeGreaterThan(0);
    expect(tests.length).toBeGreaterThan(0);
    // The test finding is visible…
    expect(tests[0]?.file).toContain('tests/');
    // …but only the prod errors are counted.
    const prodErrors = prod.filter((d) => d.severity === 'error');
    const testErrors = tests.filter((d) => d.severity === 'error');
    expect(prodErrors.length).toBeGreaterThan(0);
    expect(testErrors.length).toBeGreaterThan(0);
    expect(report.errorCount).toBe(prodErrors.length);
  });

  it('scores test findings when includeTestFiles is set', async () => {
    const dir = scaffold();
    const base = await audit({ rootDir: dir, deadCode: false });
    const withTests = await audit({
      rootDir: dir,
      deadCode: false,
      includeTestFiles: true,
    });

    expect(withTests.errorCount).toBeGreaterThan(base.errorCount);
    expect(withTests.score).toBeLessThan(base.score);
  });

  it('keeps the exit gate clean when only test files have errors', async () => {
    const dir = join(root, 'tests-only');
    mkdirSync(join(dir, 'tests'), { recursive: true });
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'fx2', dependencies: { vue: '^3.5.0' } }),
    );
    writeFileSync(join(dir, 'tests', 'Only.test.vue'), VIOLATION);

    const report = await audit({ rootDir: dir, deadCode: false });
    expect(report.diagnostics.length).toBeGreaterThan(0);
    expect(report.errorCount).toBe(0);
    expect(report.exitCode).toBe(0);

    const opted = await audit({
      rootDir: dir,
      deadCode: false,
      includeTestFiles: true,
    });
    expect(opted.errorCount).toBeGreaterThan(0);
    expect(opted.exitCode).toBe(1);
  });
});
