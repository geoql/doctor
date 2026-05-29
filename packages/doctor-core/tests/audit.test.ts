import { realpathSync } from 'node:fs';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { audit } from '../src/audit.js';

async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-audit-'));
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, name), content);
  }
  return dir;
}

describe('audit', () => {
  it('scores a clean fixture 100 with exitCode 0', async () => {
    const dir = await fixture({
      'clean.vue': '<template><div /></template>\n',
    });
    const report = await audit({ rootDir: dir });
    expect(report.score).toBe(100);
    expect(report.errorCount).toBe(0);
    expect(report.exitCode).toBe(0);
    expect(report.rootDir).toBe(dir);
    expect(report.filesScanned).toBeGreaterThanOrEqual(1);
  });

  it('flags a template v-for-without-key error and sets exitCode 1', async () => {
    const dir = await fixture({
      'bad.vue': '<template><li v-for="i in items">{{ i }}</li></template>\n',
    });
    const report = await audit({ rootDir: dir });
    expect(report.errorCount).toBeGreaterThanOrEqual(1);
    expect(report.exitCode).toBe(1);
    expect(report.score).toBeLessThan(100);
    expect(
      report.diagnostics.some((d) => d.ruleId.includes('v-for-has-key')),
    ).toBe(true);
  });

  it('flips a warning-only result to exitCode 1 when failOn is warning', async () => {
    const dir = await fixture({
      'warn.vue':
        '<template><li v-for="i in items" :key="i">{{ i }}</li></template>\n',
    });
    const report = await audit({
      rootDir: dir,
      rules: { 'vue-doctor/template/v-for-has-key': 'warning' },
      failOn: 'warning',
    });
    if (report.warningCount > 0) {
      expect(report.exitCode).toBe(1);
    } else {
      expect(report.exitCode).toBe(0);
    }
  });

  it('flags a mixed Options/Composition SFC via the sfc pass', async () => {
    const dir = await fixture({
      'mixed.vue':
        '<script setup>const x = 1;</script>\n' +
        '<script>export default { data() {} };</script>\n',
    });
    const report = await audit({ rootDir: dir });
    expect(report.score).toBeLessThan(100);
    const diag = report.diagnostics.find(
      (d) => d.ruleId === 'vue-doctor/sfc/no-mixed-options-and-composition-api',
    );
    expect(diag).toBeDefined();
    expect(diag?.source).toBe('sfc');
    expect(report.exitCode).toBe(1);
  });

  it('defaults rootDir to process.cwd() when not provided', async () => {
    const dir = await fixture({
      'clean.vue': '<template><div /></template>\n',
    });
    const original = process.cwd();
    process.chdir(dir);
    try {
      const report = await audit();
      expect(report.rootDir).toBe(realpathSync(dir));
      expect(report.filesScanned).toBeGreaterThanOrEqual(1);
      expect(report.score).toBe(100);
      expect(report.exitCode).toBe(0);
    } finally {
      process.chdir(original);
    }
  });
});
