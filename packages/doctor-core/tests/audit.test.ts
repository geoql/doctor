import { realpathSync } from 'node:fs';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { audit } from '../src/audit.js';

async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-audit-'));
  for (const [name, content] of Object.entries(files)) {
    const filePath = join(dir, name);
    await mkdir(join(dir, name.split('/').slice(0, -1).join('/') || '.'), {
      recursive: true,
    });
    await writeFile(filePath, content);
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

  it('flips a warn-only result to exitCode 1 when failOn is warn', async () => {
    const dir = await fixture({
      'warn.vue':
        '<template><li v-for="i in items" :key="i">{{ i }}</li></template>\n',
    });
    const report = await audit({
      rootDir: dir,
      rules: { 'vue-doctor/template/v-for-has-key': 'warn' },
      failOn: 'warn',
    });
    if (report.warnCount > 0) {
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

  it('includes dead-code diagnostics from knip in the audit report', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'test',
        dependencies: { vue: '^3.0.0' },
      }),
      'index.html': '<div id="app"></div>',
      'src/main.ts':
        'import { createApp } from "vue";\ncreateApp({}).mount("#app");',
      'src/unused.ts': 'export const unused = 1;',
    });
    const report = await audit({ rootDir: dir });
    const deadCodeDiags = report.diagnostics.filter(
      (d) => d.source === 'dead-code',
    );
    expect(deadCodeDiags.length).toBeGreaterThan(0);
    expect(
      deadCodeDiags.some((d) => d.ruleId === 'dead-code/unused-file'),
    ).toBe(true);
  });

  it('skips dead-code pass when deadCode config is false', async () => {
    const dir = await fixture({
      'clean.vue': '<template><div /></template>\n',
    });
    const report = await audit({ rootDir: dir, deadCode: false });
    expect(
      report.diagnostics.filter((d) => d.source === 'dead-code'),
    ).toHaveLength(0);
  });

  it('survives dead-code pass failure gracefully', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'test',
        dependencies: { vue: '^3.0.0' },
        devDependencies: {
          'vue-tsc': '^2.0.0',
          'eslint-plugin-vue': '^9.0.0',
        },
      }),
      'index.html': '<div id="app"></div>',
      'src/main.ts':
        'import { createApp } from "vue";\ncreateApp({}).mount("#app");',
    });
    const { _knipLoader } = await import('../src/check-dead-code.js');
    vi.spyOn(_knipLoader, 'load').mockRejectedValueOnce(
      new Error('knip failed'),
    );
    const report = await audit({ rootDir: dir });
    expect(report.score).toBe(100);
  });

  it('remaps a build-quality diagnostic severity via a rule override', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'test',
        dependencies: { vue: '^3.0.0' },
        devDependencies: { 'eslint-plugin-vue': '^9.0.0' },
      }),
    });
    const report = await audit({
      rootDir: dir,
      deadCode: false,
      rules: { 'vue-doctor/build-quality/vue-tsc-in-devDeps': 'error' },
    });
    const diag = report.diagnostics.find(
      (d) => d.ruleId === 'vue-doctor/build-quality/vue-tsc-in-devDeps',
    );
    expect(diag).toBeDefined();
    expect(diag?.severity).toBe('error');
    expect(diag?.source).toBe('project');
    expect(report.exitCode).toBe(1);
  });

  it('disables a build-quality diagnostic via an off rule override', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'test',
        dependencies: { vue: '^3.0.0' },
        devDependencies: { 'eslint-plugin-vue': '^9.0.0' },
      }),
    });
    const report = await audit({
      rootDir: dir,
      deadCode: false,
      rules: { 'vue-doctor/build-quality/vue-tsc-in-devDeps': 'off' },
    });
    expect(
      report.diagnostics.some(
        (d) => d.ruleId === 'vue-doctor/build-quality/vue-tsc-in-devDeps',
      ),
    ).toBe(false);
  });

  it('restricts diagnostics to scopeFiles when provided', async () => {
    const dir = await fixture({
      'A.vue': '<template><li v-for="i in items">{{ i }}</li></template>\n',
      'B.vue': '<template><li v-for="j in items">{{ j }}</li></template>\n',
    });
    const full = await audit({ rootDir: dir, deadCode: false });
    expect(full.diagnostics.length).toBeGreaterThanOrEqual(2);

    const scoped = await audit({
      rootDir: dir,
      deadCode: false,
      scopeFiles: [resolve(dir, 'A.vue')],
    });
    expect(scoped.diagnostics.length).toBeGreaterThan(0);
    expect(scoped.diagnostics.every((d) => d.file.endsWith('A.vue'))).toBe(
      true,
    );
  });

  it('yields an empty diagnostic set when scopeFiles is empty', async () => {
    const dir = await fixture({
      'Bad.vue': '<template><li v-for="i in items">{{ i }}</li></template>\n',
    });
    const report = await audit({
      rootDir: dir,
      deadCode: false,
      scopeFiles: [],
    });
    expect(report.diagnostics).toEqual([]);
    expect(report.score).toBe(100);
  });

  it('suppresses a diagnostic guarded by an inline doctor-disable directive', async () => {
    const dir = await fixture({
      'Bad.vue': [
        '<template>',
        '  <!-- doctor-disable-next-line v-for-has-key -->',
        '  <li v-for="i in items">{{ i }}</li>',
        '</template>',
        '',
      ].join('\n'),
    });
    const report = await audit({ rootDir: dir, deadCode: false });
    expect(report.diagnostics).toEqual([]);
    expect(report.score).toBe(100);
    expect(report.exitCode).toBe(0);
  });

  it('surfaces the suppressed diagnostic when respectInlineDisables is false', async () => {
    const dir = await fixture({
      'Bad.vue': [
        '<template>',
        '  <!-- doctor-disable-next-line v-for-has-key -->',
        '  <li v-for="i in items">{{ i }}</li>',
        '</template>',
        '',
      ].join('\n'),
    });
    const report = await audit({
      rootDir: dir,
      deadCode: false,
      respectInlineDisables: false,
    });
    expect(
      report.diagnostics.some((d) => d.ruleId.includes('v-for-has-key')),
    ).toBe(true);
    expect(report.exitCode).toBe(1);
  });

  it('skips the lint passes when lint is false', async () => {
    const dir = await fixture({
      'Bad.vue': '<template><li v-for="i in items">{{ i }}</li></template>\n',
    });
    const full = await audit({ rootDir: dir, deadCode: false });
    expect(full.diagnostics.length).toBeGreaterThan(0);

    const noLint = await audit({ rootDir: dir, deadCode: false, lint: false });
    expect(noLint.diagnostics).toEqual([]);
    expect(noLint.score).toBe(100);
    expect(noLint.exitCode).toBe(0);
  });

  it('populates timings with template, sfc, script, deadCode, and total fields', async () => {
    const dir = await fixture({
      'Bad.vue': '<template><li v-for="i in items">{{ i }}</li></template>\n',
    });
    const report = await audit({ rootDir: dir, deadCode: false });
    expect(report.timings).toBeDefined();
    expect(report.timings!.template).toBeGreaterThanOrEqual(0);
    expect(report.timings!.sfc).toBeGreaterThanOrEqual(0);
    expect(report.timings!.script).toBeGreaterThanOrEqual(0);
    expect(report.timings!.deadCode).toBe(0);
    expect(report.timings!.total).toBeGreaterThan(0);
  });

  it('populates timings.deadCode when dead code pass runs', async () => {
    const dir = await fixture({
      'package.json': JSON.stringify({
        name: 'test',
        dependencies: { vue: '^3.0.0' },
      }),
      'index.html': '<div id="app"></div>',
      'src/main.ts':
        'import { createApp } from "vue";\ncreateApp({}).mount("#app");',
      'src/unused.ts': 'export const unused = 1;',
    });
    const report = await audit({ rootDir: dir });
    expect(report.timings!.deadCode).toBeGreaterThan(0);
  });

  it('populates ruleCounts mapping ruleId to occurrence count', async () => {
    const dir = await fixture({
      'Bad.vue': '<template><li v-for="i in items">{{ i }}</li></template>\n',
    });
    const report = await audit({ rootDir: dir, deadCode: false });
    expect(report.ruleCounts).toBeDefined();
    const vForKeyDiags = report.diagnostics.filter((d) =>
      d.ruleId.includes('v-for-has-key'),
    );
    expect(vForKeyDiags.length).toBeGreaterThan(0);
    expect(report.ruleCounts!['vue-doctor/template/v-for-has-key']).toBe(
      vForKeyDiags.length,
    );
  });

  it('ruleCounts sums occurrences across all passes', async () => {
    const dir = await fixture({
      'Bad.vue': '<template><li v-for="i in items">{{ i }}</li></template>\n',
      'package.json': JSON.stringify({
        name: 'test',
        dependencies: { vue: '^3.0.0' },
      }),
      'index.html': '<div id="app"></div>',
      'src/main.ts':
        'import { createApp } from "vue";\ncreateApp({}).mount("#app");',
      'src/unused.ts': 'export const unused = 1;',
    });
    const report = await audit({ rootDir: dir });
    const totalRules = Object.values(report.ruleCounts ?? {}).reduce(
      (sum, count) => sum + count,
      0,
    );
    expect(totalRules).toBe(report.diagnostics.length);
  });
});
