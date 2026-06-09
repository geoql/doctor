import { describe, expect, it } from 'vitest';
import { sarifReport } from '../../src/reporters/sarif.js';
import type { ReporterInput } from '../../src/reporters/types.js';
import type { Diagnostic } from '../../src/types.js';

function makeInput(
  diagnostics: Diagnostic[],
  rootDirectory = '/repo',
): ReporterInput {
  return {
    toolName: '@geoql/vue-doctor',
    toolVersion: '0.1.0',
    rootDirectory,
    analyzedFileCount: 1,
    elapsedMs: 12,
    diagnostics,
    score: {
      score: 100,
      threshold: 0,
      passed: true,
      bySeverity: { error: 0, warn: 0, info: 0 },
      breakdown: [],
    },
  };
}

const ERROR_DIAG: Diagnostic = {
  file: '/repo/src/A.vue',
  line: 3,
  column: 9,
  endLine: 3,
  endColumn: 13,
  ruleId: 'vue-doctor/template/v-for-has-key',
  severity: 'error',
  message: '<li> uses v-for without :key.',
  source: 'template',
};

const WARN_DIAG: Diagnostic = {
  file: '/repo/src/B.vue',
  line: 1,
  column: 1,
  ruleId: 'vue-doctor/no-em-dash-in-string',
  severity: 'warn',
  message: 'em-dash detected',
  source: 'oxlint',
};

const INFO_DIAG: Diagnostic = {
  file: '/elsewhere/C.ts',
  line: 5,
  column: 2,
  ruleId: 'vue-doctor/reactivity/prefer-shallowRef-for-large-data',
  severity: 'info',
  message: 'consider shallowRef',
  source: 'oxlint',
};

describe('sarifReport', () => {
  it('emits SARIF v2.1.0 envelope with schema and version', () => {
    const parsed = JSON.parse(sarifReport(makeInput([]))) as {
      $schema: string;
      version: string;
    };
    expect(parsed.$schema).toContain('sarif-schema-2.1.0.json');
    expect(parsed.version).toBe('2.1.0');
  });

  it('emits a single run with tool.driver metadata from input', () => {
    const parsed = JSON.parse(sarifReport(makeInput([]))) as {
      runs: {
        tool: {
          driver: { name: string; version: string; informationUri: string };
        };
      }[];
    };
    expect(parsed.runs).toHaveLength(1);
    expect(parsed.runs[0]!.tool.driver.name).toBe('@geoql/vue-doctor');
    expect(parsed.runs[0]!.tool.driver.version).toBe('0.1.0');
    expect(parsed.runs[0]!.tool.driver.informationUri).toBe(
      'https://github.com/geoql/doctor',
    );
  });

  it('emits empty rules and results when no diagnostics', () => {
    const parsed = JSON.parse(sarifReport(makeInput([]))) as {
      runs: { tool: { driver: { rules: unknown[] } }; results: unknown[] }[];
    };
    expect(parsed.runs[0]!.tool.driver.rules).toEqual([]);
    expect(parsed.runs[0]!.results).toEqual([]);
  });

  it('maps severity error->error, warn->warning, info->note', () => {
    const parsed = JSON.parse(
      sarifReport(makeInput([ERROR_DIAG, WARN_DIAG, INFO_DIAG])),
    ) as { runs: { results: { ruleId: string; level: string }[] }[] };
    const byId: Record<string, string> = {};
    for (const r of parsed.runs[0]!.results) byId[r.ruleId] = r.level;
    expect(byId['vue-doctor/template/v-for-has-key']).toBe('error');
    expect(byId['vue-doctor/no-em-dash-in-string']).toBe('warning');
    expect(byId['vue-doctor/reactivity/prefer-shallowRef-for-large-data']).toBe(
      'note',
    );
  });

  it('emits unique sorted rule descriptors from registry', () => {
    const parsed = JSON.parse(
      sarifReport(makeInput([ERROR_DIAG, ERROR_DIAG, WARN_DIAG])),
    ) as {
      runs: {
        tool: {
          driver: {
            rules: {
              id: string;
              name: string;
              properties: { category: string };
            }[];
          };
        };
      }[];
    };
    const rules = parsed.runs[0]!.tool.driver.rules;
    expect(rules.length).toBe(2);
    expect(rules[0]!.id).toBe('vue-doctor/no-em-dash-in-string');
    expect(rules[1]!.id).toBe('vue-doctor/template/v-for-has-key');
    expect(rules[1]!.properties.category).toBe('template');
  });

  it('falls back to "doctor-owned" + warn for unknown rule ids', () => {
    const unknownDiag: Diagnostic = {
      ...WARN_DIAG,
      ruleId: 'unknown/rule',
      severity: 'warn',
    };
    const parsed = JSON.parse(sarifReport(makeInput([unknownDiag]))) as {
      runs: {
        tool: {
          driver: { rules: { id: string; properties: { category: string } }[] };
        };
      }[];
    };
    const r = parsed.runs[0]!.tool.driver.rules[0]!;
    expect(r.id).toBe('unknown/rule');
    expect(r.properties.category).toBe('doctor-owned');
  });

  it('uses the bare ruleId as descriptor.name when ruleId has no slash', () => {
    const plain: Diagnostic = { ...WARN_DIAG, ruleId: 'simplename' };
    const parsed = JSON.parse(sarifReport(makeInput([plain]))) as {
      runs: { tool: { driver: { rules: { id: string; name: string }[] } } }[];
    };
    expect(parsed.runs[0]!.tool.driver.rules[0]!.name).toBe('simplename');
  });

  it('relativizes file URIs to rootDirectory when prefixed', () => {
    const parsed = JSON.parse(
      sarifReport(makeInput([ERROR_DIAG], '/repo')),
    ) as {
      runs: {
        results: {
          locations: {
            physicalLocation: { artifactLocation: { uri: string } };
          }[];
        }[];
      }[];
    };
    expect(
      parsed.runs[0]!.results[0]!.locations[0]!.physicalLocation
        .artifactLocation.uri,
    ).toBe('src/A.vue');
  });

  it('handles trailing slash in rootDirectory', () => {
    const parsed = JSON.parse(
      sarifReport(makeInput([ERROR_DIAG], '/repo/')),
    ) as {
      runs: {
        results: {
          locations: {
            physicalLocation: { artifactLocation: { uri: string } };
          }[];
        }[];
      }[];
    };
    expect(
      parsed.runs[0]!.results[0]!.locations[0]!.physicalLocation
        .artifactLocation.uri,
    ).toBe('src/A.vue');
  });

  it('keeps absolute path when file is outside rootDirectory', () => {
    const parsed = JSON.parse(sarifReport(makeInput([INFO_DIAG], '/repo'))) as {
      runs: {
        results: {
          locations: {
            physicalLocation: { artifactLocation: { uri: string } };
          }[];
        }[];
      }[];
    };
    expect(
      parsed.runs[0]!.results[0]!.locations[0]!.physicalLocation
        .artifactLocation.uri,
    ).toBe('/elsewhere/C.ts');
  });

  it('emits region with startLine/startColumn (and endLine/endColumn when present)', () => {
    const parsed = JSON.parse(
      sarifReport(makeInput([ERROR_DIAG, WARN_DIAG])),
    ) as {
      runs: {
        results: {
          locations: {
            physicalLocation: {
              region: {
                startLine: number;
                startColumn: number;
                endLine?: number;
                endColumn?: number;
              };
            };
          }[];
        }[];
      }[];
    };
    const errorRegion =
      parsed.runs[0]!.results[0]!.locations[0]!.physicalLocation.region;
    expect(errorRegion).toEqual({
      startLine: 3,
      startColumn: 9,
      endLine: 3,
      endColumn: 13,
    });
    const warnRegion =
      parsed.runs[0]!.results[1]!.locations[0]!.physicalLocation.region;
    expect(warnRegion).toEqual({ startLine: 1, startColumn: 1 });
  });

  it('emits trailing newline for stdout consumers', () => {
    expect(sarifReport(makeInput([])).endsWith('\n')).toBe(true);
  });

  it('emits uriBaseId %SRCROOT% on artifactLocation (GitHub Code Scanning requirement)', () => {
    const parsed = JSON.parse(sarifReport(makeInput([ERROR_DIAG]))) as {
      runs: {
        results: {
          locations: {
            physicalLocation: { artifactLocation: { uriBaseId: string } };
          }[];
        }[];
      }[];
    };
    expect(
      parsed.runs[0]!.results[0]!.locations[0]!.physicalLocation
        .artifactLocation.uriBaseId,
    ).toBe('%SRCROOT%');
  });

  it('emits partialFingerprints.primaryLocationLineHash for GitHub dedup', () => {
    const parsed = JSON.parse(sarifReport(makeInput([ERROR_DIAG]))) as {
      runs: {
        results: { partialFingerprints: { primaryLocationLineHash: string } }[];
      }[];
    };
    const fp =
      parsed.runs[0]!.results[0]!.partialFingerprints.primaryLocationLineHash;
    expect(fp).toBe('src/A.vue:3:vue-doctor/template/v-for-has-key');
  });

  it('partialFingerprints are stable across reruns for the same finding', () => {
    const first = JSON.parse(sarifReport(makeInput([ERROR_DIAG]))) as {
      runs: {
        results: { partialFingerprints: { primaryLocationLineHash: string } }[];
      }[];
    };
    const second = JSON.parse(sarifReport(makeInput([ERROR_DIAG]))) as {
      runs: {
        results: { partialFingerprints: { primaryLocationLineHash: string } }[];
      }[];
    };
    expect(first.runs[0]!.results[0]!.partialFingerprints).toEqual(
      second.runs[0]!.results[0]!.partialFingerprints,
    );
  });

  it('partialFingerprints differ across files / lines / rules', () => {
    const parsed = JSON.parse(
      sarifReport(makeInput([ERROR_DIAG, WARN_DIAG, INFO_DIAG])),
    ) as {
      runs: {
        results: { partialFingerprints: { primaryLocationLineHash: string } }[];
      }[];
    };
    const hashes = parsed.runs[0]!.results.map(
      (r) => r.partialFingerprints.primaryLocationLineHash,
    );
    expect(new Set(hashes).size).toBe(hashes.length);
  });

  it('emits helpUri on each rule descriptor pointing at docs.the-doctor.report', () => {
    const parsed = JSON.parse(sarifReport(makeInput([ERROR_DIAG]))) as {
      runs: {
        tool: { driver: { rules: { id: string; helpUri: string }[] } };
      }[];
    };
    const rule = parsed.runs[0]!.tool.driver.rules[0]!;
    expect(rule.helpUri).toContain('docs.the-doctor.report');
    expect(rule.helpUri).toContain('vue-doctor/template/v-for-has-key');
  });

  it('emits fullDescription on every rule descriptor sourced from loadRuleDoc', () => {
    const parsed = JSON.parse(sarifReport(makeInput([ERROR_DIAG]))) as {
      runs: {
        tool: {
          driver: {
            rules: { id: string; fullDescription: { text: string } }[];
          };
        };
      }[];
    };
    const rule = parsed.runs[0]!.tool.driver.rules[0]!;
    expect(rule.fullDescription.text).toContain(
      'vue-doctor/template/v-for-has-key',
    );
    expect(rule.fullDescription.text.length).toBeGreaterThan(rule.id.length);
  });

  it('falls back to bare ruleId in fullDescription for unknown rules', () => {
    const unknownDiag = { ...WARN_DIAG, ruleId: 'unknown/rule' };
    const parsed = JSON.parse(sarifReport(makeInput([unknownDiag]))) as {
      runs: {
        tool: { driver: { rules: { fullDescription: { text: string } }[] } };
      }[];
    };
    expect(parsed.runs[0]!.tool.driver.rules[0]!.fullDescription.text).toBe(
      'unknown/rule',
    );
  });
});
