import { describe, expect, it } from 'vitest';
import { format } from '../src/reporters/index.js';
import { prCommentReport } from '../src/reporters/pr-comment.js';
import type { ReporterInput } from '../src/reporters/types.js';
import { scoreDiagnostics } from '../src/score.js';
import type { Diagnostic } from '../src/types.js';

function diag(overrides: Partial<Diagnostic>): Diagnostic {
  return {
    file: '/proj/src/Foo.vue',
    line: 14,
    column: 7,
    ruleId: 'vue-doctor/template/v-for-has-key',
    severity: 'error',
    message: 'Every v-for needs a :key.',
    source: 'template',
    ...overrides,
  };
}

function makeInput(
  diagnostics: Diagnostic[],
  toolName = '@geoql/vue-doctor',
): ReporterInput {
  return {
    toolName,
    toolVersion: '0.1.0',
    rootDirectory: '/proj',
    analyzedFileCount: 10,
    elapsedMs: 100,
    diagnostics,
    score: scoreDiagnostics(diagnostics),
    projectInfo: {
      framework: 'vue',
      vueVersion: '3.5.0',
      nuxtVersion: null,
      capabilities: ['vue:3'],
      rootDirectory: '/proj',
    },
  };
}

describe('prCommentReport', () => {
  it('renders the header with tool name and score', () => {
    const out = prCommentReport(makeInput([diag({})]));
    expect(out.startsWith('## 🛡 @geoql/vue-doctor — Score: 95\n')).toBe(true);
  });

  it('renders the summary line counting only errors and warnings', () => {
    const out = prCommentReport(
      makeInput([
        diag({ ruleId: 'e1', severity: 'error' }),
        diag({ ruleId: 'w1', severity: 'warn' }),
        diag({ ruleId: 'w2', severity: 'warn' }),
      ]),
    );
    expect(out).toContain('**3 findings** (1 errors, 2 warnings)');
  });

  it('lists errors and warnings as relative file:line ruleId — message', () => {
    const out = prCommentReport(
      makeInput([
        diag({
          file: '/proj/src/A.vue',
          line: 3,
          ruleId: 'vue-doctor/template/v-for-has-key',
          severity: 'error',
          message: 'needs key',
        }),
        diag({
          file: '/proj/src/B.vue',
          line: 9,
          ruleId: 'vue-doctor/reactivity/watch-without-cleanup',
          severity: 'warn',
          message: 'clean up your watcher',
        }),
      ]),
    );
    expect(out).toContain('### Errors');
    expect(out).toContain(
      '- `src/A.vue:3` vue-doctor/template/v-for-has-key — needs key',
    );
    expect(out).toContain('### Warnings');
    expect(out).toContain(
      '- `src/B.vue:9` vue-doctor/reactivity/watch-without-cleanup — clean up your watcher',
    );
  });

  it('excludes info-severity findings from the body but keeps the score', () => {
    const out = prCommentReport(
      makeInput([
        diag({
          ruleId: 'info-only',
          severity: 'info',
          message: 'just guidance',
        }),
      ]),
    );
    expect(out).not.toContain('just guidance');
    expect(out).toContain('✓ No actionable findings. Score: 100');
  });

  it('renders a clean body when there are zero actionable findings', () => {
    const out = prCommentReport(makeInput([]));
    expect(out).toBe(
      '## 🛡 @geoql/vue-doctor — Score: 100\n\n✓ No actionable findings. Score: 100\n',
    );
  });

  it('caps each section at the top 5 findings', () => {
    const errors = Array.from({ length: 7 }, (_, i) =>
      diag({
        file: `/proj/src/E${i}.vue`,
        line: i + 1,
        ruleId: `rule-${i}`,
        severity: 'error',
        message: `error ${i}`,
      }),
    );
    const out = prCommentReport(makeInput(errors));
    const listed = out.split('\n').filter((l) => l.startsWith('- `'));
    expect(listed).toHaveLength(5);
    expect(out).toContain('src/E0.vue:1');
    expect(out).not.toContain('src/E5.vue');
    expect(out).not.toContain('src/E6.vue');
  });

  it('omits the Warnings section when there are only errors', () => {
    const out = prCommentReport(makeInput([diag({ severity: 'error' })]));
    expect(out).toContain('### Errors');
    expect(out).not.toContain('### Warnings');
  });

  it('omits the Errors section when there are only warnings', () => {
    const out = prCommentReport(
      makeInput([diag({ ruleId: 'only-warn', severity: 'warn' })]),
    );
    expect(out).not.toContain('### Errors');
    expect(out).toContain('### Warnings');
  });

  it('footer links to the docs base and the top finding explain command', () => {
    const out = prCommentReport(makeInput([diag({ severity: 'error' })]));
    expect(out).toContain('https://docs.the-doctor.report/rules/');
    expect(out).toContain(
      'Run `vue-doctor explain vue-doctor/template/v-for-has-key`',
    );
  });

  it('uses the top warning for the explain command when there are no errors', () => {
    const out = prCommentReport(
      makeInput([diag({ ruleId: 'only-warn', severity: 'warn' })]),
    );
    expect(out).toContain(
      'Run `nuxt-doctor explain only-warn`'.replace('nuxt', 'vue'),
    );
  });

  it('derives the bin name from the nuxt tool name', () => {
    const out = prCommentReport(
      makeInput([diag({ severity: 'error' })], '@geoql/nuxt-doctor'),
    );
    expect(out.startsWith('## 🛡 @geoql/nuxt-doctor — Score: 95\n')).toBe(true);
    expect(out).toContain('Run `nuxt-doctor explain');
  });

  it('is reachable through the format() dispatch', () => {
    const out = format(makeInput([diag({})]), 'pr-comment');
    expect(out).toContain('## 🛡 @geoql/vue-doctor — Score:');
  });

  it('orders same-file findings by line then column', () => {
    const out = prCommentReport(
      makeInput([
        diag({
          ruleId: 'rule-a',
          file: '/proj/src/Foo.vue',
          line: 20,
          column: 1,
        }),
        diag({
          ruleId: 'rule-b',
          file: '/proj/src/Foo.vue',
          line: 10,
          column: 9,
        }),
        diag({
          ruleId: 'rule-c',
          file: '/proj/src/Foo.vue',
          line: 10,
          column: 2,
        }),
      ]),
    );
    const idxC = out.indexOf('rule-c');
    const idxB = out.indexOf('rule-b');
    const idxA = out.indexOf('rule-a');
    expect(idxC).toBeGreaterThan(-1);
    expect(idxC).toBeLessThan(idxB);
    expect(idxB).toBeLessThan(idxA);
  });
});
