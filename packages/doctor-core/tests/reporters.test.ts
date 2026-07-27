import { afterEach, describe, expect, it } from 'vitest';
import { agentReport } from '../src/reporters/agent.js';
import { format, renderVerboseTrace } from '../src/reporters/index.js';
import { compareStrings } from '../src/reporters/render.js';
import { jsonCompactReport } from '../src/reporters/json-compact.js';
import {
  buildDoctorReport,
  DOCTOR_REPORT_SCHEMA_VERSION,
  jsonReport,
} from '../src/reporters/json.js';
import { prettyReport } from '../src/reporters/pretty.js';
import type { ReporterInput, ReporterOptions } from '../src/reporters/types.js';
import type { ScoreResult } from '../src/score.js';
import { scoreDiagnostics } from '../src/score.js';
import type { Diagnostic } from '../src/types.js';

const ESC = String.fromCharCode(27);
const ANSI = new RegExp(`${ESC}\\[`);

function diag(overrides: Partial<Diagnostic>): Diagnostic {
  return {
    file: '/proj/src/Foo.vue',
    line: 14,
    column: 7,
    ruleId: 'reactivity/no-destructure-reactive',
    severity: 'error',
    message: 'Destructuring a reactive object loses reactivity.',
    source: 'sfc',
    recommendation: 'const { name } = toRefs(props)',
    codeSnippet: 'const { name, age } = props',
    ...overrides,
  };
}

interface InputOverrides {
  diagnostics?: Diagnostic[];
  score?: ScoreResult;
  toolVersion?: string;
  analyzedFileCount?: number;
  elapsedMs?: number;
  capabilities?: string[];
}

function makeInput(overrides: InputOverrides = {}): ReporterInput {
  const diagnostics = overrides.diagnostics ?? [];
  return {
    toolName: '@geoql/vue-doctor',
    toolVersion: overrides.toolVersion ?? '0.1.0',
    rootDirectory: '/proj',
    analyzedFileCount: overrides.analyzedFileCount ?? 47,
    elapsedMs: overrides.elapsedMs ?? 1234,
    diagnostics,
    score: overrides.score ?? scoreDiagnostics(diagnostics),
    projectInfo: {
      framework: 'vue',
      frameworkDetected: true,
      vueVersion: '3.5.0',
      nuxtVersion: null,
      capabilities: overrides.capabilities ?? [
        'typescript',
        'vue:3',
        'vue:3.5',
      ],
      rootDirectory: '/proj',
    },
  };
}

const EMPTY_BY_DIMENSION = scoreDiagnostics([]).byDimension;

function fixedScore(score: number): ScoreResult {
  return {
    score,
    passed: true,
    threshold: 0,
    totalFindings: 0,
    errorCount: 0,
    warnCount: 0,
    infoCount: 0,
    breakdown: [],
    byDimension: EMPTY_BY_DIMENSION,
  };
}

describe('compareStrings', () => {
  it('returns -1, 1, and 0 for less-than, greater-than, and equal', () => {
    expect(compareStrings('a', 'b')).toBe(-1);
    expect(compareStrings('b', 'a')).toBe(1);
    expect(compareStrings('a', 'a')).toBe(0);
  });
});

describe('agent reporter', () => {
  it('renders the clean report exactly with FINDINGS clean line', () => {
    const out = agentReport(makeInput());
    expect(out).toBe(
      '@geoql/vue-doctor v0.1.0\n' +
        'analyzed 47 files in 1.2s\n' +
        '\n' +
        'SCORE: 100/100 (threshold: 0)\n' +
        '\n' +
        'FINDINGS: 0 (clean)\n',
    );
  });

  it('renders a single-error report block + NEXT STEPS exactly', () => {
    const out = agentReport(makeInput({ diagnostics: [diag({})] }));
    expect(out).toBe(
      '@geoql/vue-doctor v0.1.0\n' +
        'analyzed 47 files in 1.2s\n' +
        '\n' +
        'SCORE: 95/100 (threshold: 0)\n' +
        '\n' +
        'FINDINGS: 1 (1 error, 0 warn, 0 info)\n' +
        '\n' +
        '[1] error  reactivity/no-destructure-reactive\n' +
        '    file: src/Foo.vue:14:7\n' +
        '    code: const { name, age } = props\n' +
        '    fix:  const { name } = toRefs(props)\n' +
        '    why:  Destructuring a reactive object loses reactivity.\n' +
        '    docs: https://docs.the-doctor.report/rules/reactivity/no-destructure-reactive\n' +
        '\n' +
        'NEXT STEPS:\n' +
        '  −5 pts  1× reactivity/no-destructure-reactive\n' +
        '  Run `vue-doctor explain reactivity/no-destructure-reactive` for full context.\n',
    );
  });

  it('emits zero ANSI escapes', () => {
    const out = agentReport(makeInput({ diagnostics: [diag({})] }));
    expect(out).not.toMatch(ANSI);
  });

  it('is deterministic across 100 runs', () => {
    const input = makeInput({
      diagnostics: [
        diag({ file: '/proj/src/b.vue', ruleId: 'b', severity: 'warn' }),
        diag({ file: '/proj/src/a.vue', ruleId: 'a' }),
      ],
    });
    const expected = agentReport(input);
    for (let i = 0; i < 100; i++) {
      expect(agentReport(input)).toBe(expected);
    }
  });

  it('sorts blocks by relative path, line, column, then ruleId', () => {
    const out = agentReport(
      makeInput({
        diagnostics: [
          diag({ file: '/proj/src/z.vue', line: 1, column: 1, ruleId: 'z' }),
          diag({ file: '/proj/src/a.vue', line: 9, column: 2, ruleId: 'b' }),
          diag({ file: '/proj/src/a.vue', line: 9, column: 2, ruleId: 'a' }),
        ],
      }),
    );
    const aIdx = out.indexOf('/rules/a\n');
    const bIdx = out.indexOf('/rules/b\n');
    const zIdx = out.indexOf('/rules/z\n');
    expect(aIdx).toBeGreaterThan(-1);
    expect(aIdx).toBeLessThan(bIdx);
    expect(bIdx).toBeLessThan(zIdx);
    expect(out).toContain('[1] error  a\n');
    expect(out).toContain('[3] error  z\n');
  });

  it('exercises every sort comparator branch including equal diagnostics', () => {
    const base = {
      severity: 'error' as const,
      message: 'm',
      source: 'sfc' as const,
      recommendation: undefined,
      codeSnippet: 'x',
    };
    const out = agentReport(
      makeInput({
        diagnostics: [
          { ...base, file: '/proj/src/z.vue', line: 1, column: 1, ruleId: 'r' },
          { ...base, file: '/proj/src/a.vue', line: 5, column: 9, ruleId: 'q' },
          { ...base, file: '/proj/src/a.vue', line: 5, column: 9, ruleId: 'q' },
          { ...base, file: '/proj/src/a.vue', line: 5, column: 1, ruleId: 'p' },
          { ...base, file: '/proj/src/a.vue', line: 2, column: 1, ruleId: 'p' },
          { ...base, file: '/proj/src/a.vue', line: 5, column: 9, ruleId: 'b' },
        ],
      }),
    );
    const order = out
      .split('\n')
      .filter((l) => l.startsWith('    file: '))
      .map((l) => l.slice('    file: '.length));
    expect(order).toEqual([
      'src/a.vue:2:1',
      'src/a.vue:5:1',
      'src/a.vue:5:9',
      'src/a.vue:5:9',
      'src/a.vue:5:9',
      'src/z.vue:1:1',
    ]);
  });

  it('pads severity tags to width 6 (warn gets three spaces)', () => {
    const out = agentReport(
      makeInput({ diagnostics: [diag({ severity: 'warn', ruleId: 'w' })] }),
    );
    expect(out).toContain('[1] warn   w\n');
  });

  it('renders all three severity counts in the FINDINGS line', () => {
    const out = agentReport(
      makeInput({
        diagnostics: [
          diag({ ruleId: 'e', severity: 'error' }),
          diag({ ruleId: 'w', severity: 'warn' }),
          diag({ ruleId: 'i', severity: 'info' }),
        ],
      }),
    );
    expect(out).toContain('FINDINGS: 3 (1 error, 1 warn, 1 info)\n');
  });

  it('shows "(no automated fix)" when there is no recommendation', () => {
    const out = agentReport(
      makeInput({ diagnostics: [diag({ recommendation: undefined })] }),
    );
    expect(out).toContain('    fix:  (no automated fix)\n');
  });

  it('renders an empty code line when codeSnippet is absent', () => {
    const out = agentReport(
      makeInput({ diagnostics: [diag({ codeSnippet: undefined })] }),
    );
    expect(out).toContain('    code: \n    fix:');
  });

  it('truncates code at 80 chars with a trailing ellipsis', () => {
    const long = 'a'.repeat(120);
    const out = agentReport(
      makeInput({ diagnostics: [diag({ codeSnippet: long })] }),
    );
    const codeLine = out.split('\n').find((l) => l.startsWith('    code: '))!;
    const value = codeLine.slice('    code: '.length);
    expect(value).toHaveLength(80);
    expect(value.endsWith('…')).toBe(true);
  });

  it('word-wraps why at 70 cols with continuation indented to column 10', () => {
    const message =
      'Destructuring a reactive object loses reactivity because toRefs wraps each property in a ref so reactivity survives destructuring fully.';
    const out = agentReport(makeInput({ diagnostics: [diag({ message })] }));
    expect(out).toContain('\n          ');
    const whyLines = out
      .split('\n')
      .filter((l) => l.startsWith('          ') || l.startsWith('    why:'));
    for (const line of whyLines) {
      const text = line.replace(/^( {10}| {4}why: {2})/, '');
      expect(text.length).toBeLessThanOrEqual(70);
    }
  });

  it('renders the docs URL for the ruleId', () => {
    const out = agentReport(makeInput({ diagnostics: [diag({})] }));
    expect(out).toContain(
      '    docs: https://docs.the-doctor.report/rules/reactivity/no-destructure-reactive\n',
    );
  });

  it('keeps only the top-3 breakdown entries in NEXT STEPS', () => {
    const out = agentReport(
      makeInput({
        diagnostics: [
          diag({ ruleId: 'r1', severity: 'error' }),
          diag({ ruleId: 'r2', severity: 'error' }),
          diag({ ruleId: 'r3', severity: 'warn' }),
          diag({ ruleId: 'r4', severity: 'info' }),
        ],
      }),
    );
    const stepLines = out.split('\n').filter((l) => l.startsWith('  −'));
    expect(stepLines).toHaveLength(3);
    expect(out).toContain('  Run `vue-doctor explain r1` for full context.\n');
  });

  it('suppresses NEXT STEPS when quiet is set', () => {
    const out = agentReport(makeInput({ diagnostics: [diag({})] }), {
      quiet: true,
    });
    expect(out).not.toContain('NEXT STEPS:');
  });

  it('handles an empty message (no wrapped why lines)', () => {
    const out = agentReport(
      makeInput({ diagnostics: [diag({ message: '' })] }),
    );
    expect(out).toContain('    why:  \n');
  });
});

describe('pretty reporter', () => {
  const opts: ReporterOptions = { color: true };

  afterEach(() => {
    delete process.env.NO_COLOR;
  });

  it('emits ANSI when color is enabled and NO_COLOR is unset', () => {
    delete process.env.NO_COLOR;
    const out = prettyReport(
      makeInput({
        diagnostics: [
          diag({ ruleId: 'e', severity: 'error' }),
          diag({ ruleId: 'w', severity: 'warn' }),
          diag({ ruleId: 'i', severity: 'info' }),
        ],
      }),
      opts,
    );
    expect(out).toMatch(ANSI);
    expect(out).toContain('\u001b[31merror');
    expect(out).toContain('\u001b[33mwarn');
    expect(out).toContain('\u001b[36minfo');
  });

  it('delegates to plaintext when color is false', () => {
    const input = makeInput({ diagnostics: [diag({})] });
    const out = prettyReport(input, { color: false });
    expect(out).not.toMatch(ANSI);
    expect(out).toBe(agentReport(input, { color: false }));
  });

  it('delegates to plaintext when NO_COLOR is set', () => {
    process.env.NO_COLOR = '1';
    const out = prettyReport(makeInput({ diagnostics: [diag({})] }), opts);
    expect(out).not.toMatch(ANSI);
  });

  it('tints the score red for the 0-50 tier', () => {
    process.env.NO_COLOR = '';
    const out = prettyReport(makeInput({ score: fixedScore(50) }), opts);
    expect(out).toContain('\u001b[31m50');
  });

  it('tints the score yellow at the 51 boundary', () => {
    const out = prettyReport(makeInput({ score: fixedScore(51) }), opts);
    expect(out).toContain('\u001b[33m51');
  });

  it('tints the score yellow at the 79 boundary', () => {
    const out = prettyReport(makeInput({ score: fixedScore(79) }), opts);
    expect(out).toContain('\u001b[33m79');
  });

  it('tints the score green at the 80 boundary', () => {
    const out = prettyReport(makeInput({ score: fixedScore(80) }), opts);
    expect(out).toContain('\u001b[32m80');
  });
});

describe('json reporter', () => {
  it('exports the schema version constant', () => {
    expect(DOCTOR_REPORT_SCHEMA_VERSION).toBe('1');
  });

  it('produces the schema-versioned envelope', () => {
    const out = jsonReport(makeInput({ diagnostics: [diag({})] }));
    expect(out).toContain('\n');
    const parsed = JSON.parse(out);
    expect(parsed.schemaVersion).toBe('1');
    expect(parsed.tool).toEqual({
      name: '@geoql/vue-doctor',
      version: '0.1.0',
    });
    expect(parsed.score.value).toBe(95);
    expect(parsed.score.threshold).toBe(0);
    expect(parsed.score.passed).toBe(true);
    expect(parsed.score.bySeverity).toEqual({ error: 1, warn: 0, info: 0 });
    expect(parsed.score.breakdown[0]).toEqual({
      ruleId: 'reactivity/no-destructure-reactive',
      occurrences: 1,
      weightPerOccurrence: 5,
      penalty: 5,
    });
    expect(Object.keys(parsed.score.byDimension).sort()).toEqual([
      'correctness',
      'design',
      'maintainability',
      'nuxt',
      'performance',
      'security',
    ]);
    expect(parsed.score.byDimension.performance).toEqual({
      score: 100,
      totalFindings: 0,
      error: 0,
      warn: 0,
      info: 0,
    });
    expect(parsed.timing).toEqual({ elapsedMs: 1234, analyzedFileCount: 47 });
  });

  it('relativizes diagnostic file paths and omits codeSnippet', () => {
    const out = jsonReport(makeInput({ diagnostics: [diag({})] }));
    const parsed = JSON.parse(out);
    expect(parsed.diagnostics[0].file).toBe('src/Foo.vue');
    expect(parsed.diagnostics[0].codeSnippet).toBeUndefined();
  });

  it('emits surface only for test-surface diagnostics', () => {
    const out = jsonReport(
      makeInput({
        diagnostics: [diag({ surface: 'test' }), diag({})],
      }),
    );
    const parsed = JSON.parse(out);
    expect(parsed.diagnostics[0].surface).toBe('test');
    expect(parsed.diagnostics[1].surface).toBeUndefined();
  });

  it('sorts capabilities deterministically', () => {
    const out = jsonReport(
      makeInput({ capabilities: ['vue:3.5', 'typescript', 'vue:3'] }),
    );
    const parsed = JSON.parse(out);
    expect(parsed.projectInfo.capabilities).toEqual([
      'typescript',
      'vue:3',
      'vue:3.5',
    ]);
  });

  it('includes optional diagnostic fields only when present', () => {
    const report = buildDoctorReport(
      makeInput({
        diagnostics: [
          diag({ endLine: 14, endColumn: 20 }),
          diag({
            file: '/proj/src/Bar.vue',
            endLine: undefined,
            endColumn: undefined,
            recommendation: undefined,
          }),
        ],
      }),
    );
    expect(report.diagnostics[0]?.endLine).toBe(14);
    expect(report.diagnostics[0]?.endColumn).toBe(20);
    const serialized = JSON.stringify(report.diagnostics[1]);
    expect(serialized).not.toContain('endLine');
    expect(serialized).not.toContain('recommendation');
  });

  it('is byte-identical for the same input', () => {
    const input = makeInput({ diagnostics: [diag({})] });
    expect(jsonReport(input)).toBe(jsonReport(input));
  });
});

describe('json-compact reporter', () => {
  it('emits a single newline-terminated line that parses', () => {
    const input = makeInput({ diagnostics: [diag({})] });
    const out = jsonCompactReport(input);
    expect(out.endsWith('\n')).toBe(true);
    expect(out.trimEnd()).not.toContain('\n');
    expect(JSON.parse(out)).toEqual(JSON.parse(jsonReport(input)));
  });
});

describe('format dispatch', () => {
  it('defaults to the agent reporter when no kind is given', () => {
    const out = format(makeInput());
    expect(out).toContain('SCORE: 100/100');
    expect(out).not.toMatch(ANSI);
  });

  it('routes to the agent reporter', () => {
    expect(format(makeInput(), 'agent')).toContain('FINDINGS: 0 (clean)');
  });

  it('routes to the pretty reporter', () => {
    const out = format(makeInput({ diagnostics: [diag({})] }), 'pretty', {
      color: true,
    });
    expect(out).toMatch(ANSI);
  });

  it('routes to the json reporter', () => {
    const out = format(makeInput(), 'json');
    expect(JSON.parse(out).schemaVersion).toBe('1');
  });

  it('routes to the json-compact reporter', () => {
    const out = format(makeInput(), 'json-compact');
    expect(out.endsWith('\n')).toBe(true);
    expect(JSON.parse(out).schemaVersion).toBe('1');
  });

  it('routes to the sarif reporter', () => {
    const out = format(makeInput(), 'sarif');
    const parsed = JSON.parse(out) as { $schema: string; version: string };
    expect(parsed.version).toBe('2.1.0');
    expect(parsed.$schema).toContain('sarif-schema-2.1.0.json');
  });

  it('routes to the html reporter', () => {
    const out = format(makeInput(), 'html');
    expect(out.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(out).toContain('<html lang="en">');
    expect(out).toContain('@geoql/vue-doctor');
  });
});

describe('renderVerboseTrace', () => {
  it('renders per-pass timings section', () => {
    const report = {
      timings: {
        template: 10.5,
        sfc: 8.2,
        script: 25.0,
        deadCode: 50.0,
        total: 93.7,
      },
      ruleCounts: {},
      diagnostics: [],
      score: {
        score: 100,
        passed: true,
        threshold: 0,
        totalFindings: 0,
        errorCount: 0,
        warnCount: 0,
        infoCount: 0,
        breakdown: [],
        byDimension: EMPTY_BY_DIMENSION,
      },
    };
    const out = renderVerboseTrace(report, {});
    expect(out).toContain('TIMINGS');
    expect(out).toContain('template');
    expect(out).toContain('10.5');
  });

  it('renders per-rule counts section', () => {
    const report = {
      timings: { template: 10, sfc: 8, script: 25, deadCode: 0, total: 43 },
      ruleCounts: {
        'vue-doctor/template/v-for-has-key': 3,
        'vue-doctor/sfc/no-mixed-options-and-composition-api': 1,
      },
      diagnostics: [],
      score: {
        score: 95,
        passed: true,
        threshold: 0,
        totalFindings: 4,
        errorCount: 3,
        warnCount: 1,
        infoCount: 0,
        breakdown: [],
        byDimension: EMPTY_BY_DIMENSION,
      },
    };
    const out = renderVerboseTrace(report, {});
    expect(out).toContain('RULE COUNTS');
    expect(out).toContain('v-for-has-key');
    expect(out).toContain('3');
  });

  it('renders config trace when configSource is provided', () => {
    const report = {
      timings: { template: 10, sfc: 8, script: 25, deadCode: 0, total: 43 },
      ruleCounts: {},
      diagnostics: [],
      score: {
        score: 100,
        passed: true,
        threshold: 0,
        totalFindings: 0,
        errorCount: 0,
        warnCount: 0,
        infoCount: 0,
        breakdown: [],
        byDimension: EMPTY_BY_DIMENSION,
      },
    };
    const out = renderVerboseTrace(report, { configSource: 'ts' });
    expect(out).toContain('CONFIG');
    expect(out).toContain('ts');
  });

  it('omits config trace when configSource is absent', () => {
    const report = {
      timings: { template: 10, sfc: 8, script: 25, deadCode: 0, total: 43 },
      ruleCounts: {},
      diagnostics: [],
      score: {
        score: 100,
        passed: true,
        threshold: 0,
        totalFindings: 0,
        errorCount: 0,
        warnCount: 0,
        infoCount: 0,
        breakdown: [],
        byDimension: EMPTY_BY_DIMENSION,
      },
    };
    const out = renderVerboseTrace(report, {});
    expect(out).not.toContain('CONFIG');
  });
});
