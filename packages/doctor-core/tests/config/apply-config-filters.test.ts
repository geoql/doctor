import { describe, expect, it } from 'vite-plus/test';
import {
  applyConfigFilters,
  isDiagnosticOnSurface,
} from '../../src/config/apply-config-filters.js';
import { resolveExitCode } from '../../src/exit-code.js';
import { scoreDiagnostics } from '../../src/score.js';
import type { AuditReport, Diagnostic } from '../../src/types.js';

const HEX = 'vue-doctor/design/no-raw-hex-color';
const VHTML = 'vue-doctor/security/no-v-html';
const KEY = 'vue-doctor/template/v-for-has-key';

function diag(
  ruleId: string,
  file: string,
  severity: Diagnostic['severity'],
  extra: Partial<Diagnostic> = {},
): Diagnostic {
  return {
    file,
    line: 1,
    column: 1,
    ruleId,
    severity,
    message: 'm',
    source: 'template',
    ...extra,
  };
}

function report(
  diagnostics: Diagnostic[],
  exitCode: 0 | 1 | 2 = 1,
): AuditReport {
  const scoreResult = scoreDiagnostics(diagnostics, { threshold: 0 });
  return {
    rootDir: '/proj',
    filesScanned: 3,
    diagnostics,
    score: scoreResult.score,
    errorCount: scoreResult.errorCount,
    warnCount: scoreResult.warnCount,
    infoCount: scoreResult.infoCount,
    exitCode,
    scoreResult,
    projectInfo: {
      framework: 'vue',
      frameworkDetected: true,
      vueVersion: '3.5.0',
      nuxtVersion: null,
      capabilities: [],
      rootDirectory: '/proj',
    },
    elapsedMs: 1,
    timings: { template: 0, sfc: 0, script: 0, deadCode: 0, total: 1 },
    ruleCounts: {},
    incomplete: false,
  };
}

const sample = (): AuditReport =>
  report([
    diag(HEX, 'src/ui/Card.vue', 'warn'),
    diag(VHTML, '/proj/src/pages/index.vue', 'error'),
    diag(KEY, 'src/legacy/List.vue', 'error'),
    diag(KEY, 'tests/List.spec.vue', 'error', { surface: 'test' }),
    diag('oxlint/unknown', 'src/x.ts', 'info'),
  ]);

describe('applyConfigFilters', () => {
  it('returns the report unchanged with no ignore and no surfaces', () => {
    const input = sample();
    expect(applyConfigFilters(input, { failOn: 'error' })).toBe(input);
  });

  it('ignore.rules / files / overrides drop findings everywhere', () => {
    const out = applyConfigFilters(sample(), {
      failOn: 'error',
      ignore: {
        rules: [VHTML],
        files: ['src/legacy/**'],
        overrides: [{ files: ['src/ui/**'], rules: [HEX] }],
      },
    });
    expect(out.diagnostics.map((d) => d.ruleId)).toEqual([
      KEY,
      'oxlint/unknown',
    ]);
    expect(out.errorCount).toBe(0);
    expect(out.infoCount).toBe(1);
    expect(out.exitCode).toBe(0);
    expect(out.ruleCounts).toEqual({ [KEY]: 1, 'oxlint/unknown': 1 });
  });

  it('ignore.rules alone keeps unrelated findings', () => {
    const out = applyConfigFilters(sample(), {
      failOn: 'error',
      ignore: { rules: [HEX] },
    });
    expect(out.diagnostics).toHaveLength(4);
  });

  it('an override without rules (or with an empty list) drops every rule', () => {
    for (const rules of [undefined, []]) {
      const out = applyConfigFilters(sample(), {
        failOn: 'error',
        ignore: {
          overrides: [{ files: ['src/**'], ...(rules ? { rules } : {}) }],
        },
      });
      expect(out.diagnostics.map((d) => d.file)).toEqual([
        'tests/List.spec.vue',
      ]);
    }
  });

  it('surfaces split the printed list, the score and the gate', () => {
    const out = applyConfigFilters(sample(), {
      failOn: 'error',
      surfaces: {
        cli: { excludeTags: ['design'] },
        score: { excludeCategories: ['security'] },
        ciGate: { excludeRules: [VHTML, KEY] },
      },
    });
    expect(out.diagnostics.map((d) => d.ruleId)).not.toContain(HEX);
    expect(out.errorCount).toBe(1);
    expect(out.warnCount).toBe(1);
    expect(out.gate).toEqual({ errorCount: 0, warnCount: 1 });
    expect(out.exitCode).toBe(0);
    expect(resolveExitCode(out, { failOn: 'error', warningExitCode: 7 })).toBe(
      7,
    );
  });

  it('uses the prComment surface for the PR-comment body', () => {
    const out = applyConfigFilters(sample(), {
      failOn: 'warn',
      outputSurface: 'prComment',
      surfaces: { prComment: { excludeTags: ['design'] }, cli: {} },
    });
    expect(out.diagnostics.map((d) => d.ruleId)).not.toContain(HEX);
    expect(out.exitCode).toBe(1);
  });

  it('counts test findings only with includeTestFiles', () => {
    const surfaces = { score: {} };
    expect(
      applyConfigFilters(sample(), { failOn: 'error', surfaces }).errorCount,
    ).toBe(2);
    expect(
      applyConfigFilters(sample(), {
        failOn: 'error',
        surfaces,
        includeTestFiles: true,
      }).errorCount,
    ).toBe(3);
  });

  it('keeps a crashed exit 2 and honors failOn none', () => {
    expect(
      applyConfigFilters(report([diag(KEY, 'a.vue', 'error')], 2), {
        failOn: 'error',
        surfaces: {},
      }).exitCode,
    ).toBe(2);
    expect(
      applyConfigFilters(sample(), { failOn: 'none', surfaces: {} }).exitCode,
    ).toBe(0);
  });
});

describe('isDiagnosticOnSurface', () => {
  const d = diag(HEX, 'a.vue', 'warn');

  it('shows everything when the surface is unconfigured', () => {
    expect(isDiagnosticOnSurface(d, undefined)).toBe(true);
    expect(isDiagnosticOnSurface(d, {})).toBe(true);
  });

  it('lets includes win over excludes', () => {
    expect(
      isDiagnosticOnSurface(d, {
        excludeTags: ['design'],
        includeRules: [HEX],
      }),
    ).toBe(true);
    expect(
      isDiagnosticOnSurface(d, {
        excludeRules: [HEX],
        includeCategories: ['design'],
      }),
    ).toBe(true);
    expect(
      isDiagnosticOnSurface(d, { excludeRules: [HEX], includeTags: ['vue'] }),
    ).toBe(true);
  });

  it('excludes by rule, category, or tag', () => {
    expect(isDiagnosticOnSurface(d, { excludeRules: [HEX] })).toBe(false);
    expect(isDiagnosticOnSurface(d, { excludeCategories: ['design'] })).toBe(
      false,
    );
    expect(isDiagnosticOnSurface(d, { excludeTags: ['design'] })).toBe(false);
  });

  it('treats unregistered rule ids as untagged', () => {
    const unknown = diag('oxlint/unknown', 'a.vue', 'warn');
    expect(
      isDiagnosticOnSurface(unknown, {
        excludeTags: ['design'],
        excludeCategories: ['design'],
      }),
    ).toBe(true);
  });
});
