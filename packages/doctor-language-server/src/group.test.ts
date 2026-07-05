import { describe, expect, it } from 'vitest';
import type {
  AuditReport,
  Diagnostic as CoreDiagnostic,
} from '@geoql/doctor-core';
import { groupDiagnosticsByUri } from './group.js';

const makeReport = (
  diagnostics: CoreDiagnostic[],
  rootDir = '/repo',
): AuditReport => ({
  rootDir,
  filesScanned: 1,
  diagnostics,
  score: 100,
  errorCount: 0,
  warnCount: diagnostics.length,
  infoCount: 0,
  exitCode: 0,
  scoreResult: {
    score: 100,
    errorCount: 0,
    warnCount: diagnostics.length,
    infoCount: 0,
    breakdown: [],
    penalty: 0,
  },
  projectInfo: {
    framework: 'vue',
    frameworkDetected: true,
    vueVersion: '3.5.0',
    nuxtVersion: null,
    capabilities: [],
    rootDirectory: rootDir,
  },
  elapsedMs: 1,
  timings: { template: 0, sfc: 0, script: 0, deadCode: 0, total: 1 },
  ruleCounts: {},
});

const diag = (overrides: Partial<CoreDiagnostic> = {}): CoreDiagnostic => ({
  file: 'src/App.vue',
  line: 2,
  column: 1,
  ruleId: 'vue-doctor/template/v-for-has-key',
  severity: 'warn',
  message: 'missing key',
  source: 'template',
  ...overrides,
});

describe('groupDiagnosticsByUri', () => {
  it('groups diagnostics by their resolved file URI', () => {
    const report = makeReport([
      diag({ file: 'src/App.vue' }),
      diag({ file: 'src/App.vue', line: 5 }),
      diag({ file: 'src/Other.vue' }),
    ]);
    const byUri = groupDiagnosticsByUri({ report, textForFile: () => null });

    expect(byUri.get('file:///repo/src/App.vue')).toHaveLength(2);
    expect(byUri.get('file:///repo/src/Other.vue')).toHaveLength(1);
  });

  it('clears previously-published URIs that have no findings this pass', () => {
    const report = makeReport([diag({ file: 'src/App.vue' })]);
    const byUri = groupDiagnosticsByUri({
      report,
      textForFile: () => null,
      previousUris: ['file:///repo/src/Stale.vue'],
    });

    expect(byUri.get('file:///repo/src/Stale.vue')).toEqual([]);
    expect(byUri.get('file:///repo/src/App.vue')).toHaveLength(1);
  });

  it('reuses cached text per file rather than re-reading', () => {
    let reads = 0;
    const report = makeReport([
      diag({ file: 'src/App.vue', line: 2 }),
      diag({ file: 'src/App.vue', line: 6 }),
    ]);
    groupDiagnosticsByUri({
      report,
      textForFile: () => {
        reads += 1;
        return 'line one\nline two';
      },
    });

    expect(reads).toBe(1);
  });

  it('passes file text through to the range mapper', () => {
    const report = makeReport([
      diag({ file: 'src/App.vue', line: 1, column: 1 }),
    ]);
    const byUri = groupDiagnosticsByUri({
      report,
      textForFile: () => 'const x = 1;',
    });
    const [lsp] = byUri.get('file:///repo/src/App.vue') ?? [];
    expect(lsp.range.end.character).toBe('const x = 1;'.length);
  });

  it('caches a null text result too (single read for repeat files)', () => {
    let reads = 0;
    const report = makeReport([
      diag({ file: 'src/App.vue', line: 2 }),
      diag({ file: 'src/App.vue', line: 4 }),
    ]);
    groupDiagnosticsByUri({
      report,
      textForFile: () => {
        reads += 1;
        return null;
      },
    });
    expect(reads).toBe(1);
  });
});
