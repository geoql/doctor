import { describe, expect, it } from 'vitest';
import { htmlReport } from '../../src/reporters/html.js';
import type { Diagnostic } from '../../src/types.js';
import type { ReporterInput } from '../../src/reporters/types.js';

function makeInput(diagnostics: Diagnostic[]): ReporterInput {
  return {
    toolName: '@geoql/vue-doctor',
    toolVersion: '0.0.0-test',
    rootDirectory: '/x',
    analyzedFileCount: 1,
    elapsedMs: 12.5,
    diagnostics,
    score: {
      score: diagnostics.length === 0 ? 100 : 95,
      threshold: 0,
      passed: diagnostics.filter((d) => d.severity === 'error').length === 0,
      totalFindings: diagnostics.length,
      errorCount: diagnostics.filter((d) => d.severity === 'error').length,
      warnCount: diagnostics.filter((d) => d.severity === 'warn').length,
      infoCount: diagnostics.filter((d) => d.severity === 'info').length,
      breakdown: [],
    },
  };
}

const ERROR_DIAG: Diagnostic = {
  file: '/x/src/App.vue',
  line: 3,
  column: 5,
  ruleId: 'vue-doctor/template/v-for-has-key',
  severity: 'error',
  message: '<li> uses v-for without :key. Fix: add :key="id".',
  source: 'template',
  recommendation: 'Add :key with a stable id.',
};

const WARN_DIAG: Diagnostic = {
  file: '/x/src/Other.vue',
  line: 7,
  column: 2,
  ruleId: 'vue-doctor/composition/defineProps-typed',
  severity: 'warn',
  message: 'defineProps() called without TS generics.',
  source: 'oxlint',
};

describe('htmlReport', () => {
  it('emits a complete, well-formed HTML5 document', () => {
    const html = htmlReport(makeInput([ERROR_DIAG]));
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('</html>');
    expect(html).toContain('<meta charset="UTF-8">');
  });

  it('inlines all CSS — no external CSS/JS references', () => {
    const html = htmlReport(makeInput([ERROR_DIAG]));
    expect(html).not.toContain('<link rel="stylesheet"');
    expect(html).not.toContain('<script src=');
    expect(html).toContain('<style>');
  });

  it('renders the score with pass/fail color class', () => {
    const cleanHtml = htmlReport(makeInput([]));
    expect(cleanHtml).toContain('class="score pass"');
    expect(cleanHtml).toContain('>100<');

    const failingHtml = htmlReport(makeInput([ERROR_DIAG]));
    expect(failingHtml).toContain('class="score fail"');
    expect(failingHtml).toContain('>95<');
  });

  it('renders an empty-state message when there are no findings', () => {
    const html = htmlReport(makeInput([]));
    expect(html).toContain('No findings. Clean run.');
    expect(html).not.toContain('<details');
  });

  it('renders one collapsible <details> per finding', () => {
    const html = htmlReport(makeInput([ERROR_DIAG, WARN_DIAG]));
    const detailsCount = (html.match(/<details/g) ?? []).length;
    expect(detailsCount).toBe(2);
  });

  it('uses severity-specific classes on findings (sev-error, sev-warn, sev-info)', () => {
    const html = htmlReport(makeInput([ERROR_DIAG, WARN_DIAG]));
    expect(html).toContain('class="finding sev-error"');
    expect(html).toContain('class="finding sev-warn"');
  });

  it('relativizes file paths under rootDirectory', () => {
    const html = htmlReport(makeInput([ERROR_DIAG]));
    expect(html).toContain('src/App.vue:3:5');
    expect(html).not.toContain('/x/src/App.vue');
  });

  it('escapes HTML in user-controlled fields to prevent injection', () => {
    const dangerousDiag: Diagnostic = {
      ...ERROR_DIAG,
      message: '<script>alert("xss")</script> & "stuff"',
      ruleId: 'rule/with<brackets>',
    };
    const html = htmlReport(makeInput([dangerousDiag]));
    expect(html).not.toContain('<script>alert("xss")</script>');
    expect(html).toContain(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
    expect(html).toContain('rule/with&lt;brackets&gt;');
  });

  it('includes a docs link per finding pointing at docs.doctor.geoql.in', () => {
    const html = htmlReport(makeInput([ERROR_DIAG]));
    expect(html).toContain('docs.doctor.geoql.in');
    expect(html).toContain('rel="noopener"');
  });

  it('renders recommendation when present, omits when absent', () => {
    const withRec = htmlReport(makeInput([ERROR_DIAG]));
    expect(withRec).toContain('Fix:');
    expect(withRec).toContain('Add :key with a stable id.');

    const withoutRec = htmlReport(makeInput([WARN_DIAG]));
    expect(withoutRec).not.toContain('Fix:');
  });

  it('renders meta line with tool/version/file count/elapsed time', () => {
    const html = htmlReport(makeInput([]));
    expect(html).toContain('@geoql/vue-doctor v0.0.0-test');
    expect(html).toContain('1 file');
    expect(html).toContain('13ms');
  });

  it('singularizes finding/file labels correctly', () => {
    const single = htmlReport(makeInput([ERROR_DIAG]));
    expect(single).toContain('1 finding ·');
    expect(single).toContain('1 file ·');

    const plural = htmlReport(makeInput([ERROR_DIAG, WARN_DIAG]));
    expect(plural).toContain('2 findings');
  });

  it('pluralizes file label when analyzedFileCount > 1', () => {
    const input = { ...makeInput([]), analyzedFileCount: 5 };
    const html = htmlReport(input);
    expect(html).toContain('5 files');
  });

  it('singularizes findings label when there is exactly one diag', () => {
    const html = htmlReport(makeInput([ERROR_DIAG]));
    expect(html).toContain('1 finding ·');
    expect(html).not.toContain('1 findings');
  });

  it('does not relativize paths that are outside rootDirectory', () => {
    const outsideDiag: Diagnostic = {
      ...ERROR_DIAG,
      file: '/other/abs/path/A.vue',
    };
    const html = htmlReport(makeInput([outsideDiag]));
    expect(html).toContain('/other/abs/path/A.vue:3:5');
  });
});
