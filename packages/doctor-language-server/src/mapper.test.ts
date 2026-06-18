import { describe, expect, it } from 'vitest';
import { docsUrl } from '@geoql/doctor-core';
import type { Diagnostic as CoreDiagnostic } from '@geoql/doctor-core';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { toLspDiagnostic } from './mapper.js';

const makeDiagnostic = (
  overrides: Partial<CoreDiagnostic> = {},
): CoreDiagnostic => ({
  file: 'src/App.vue',
  line: 9,
  column: 13,
  ruleId: 'vue-doctor/template/v-for-has-key',
  severity: 'warn',
  message: 'missing key',
  source: 'template',
  ...overrides,
});

describe('toLspDiagnostic', () => {
  it('maps source, code, codeDescription, severity and message', () => {
    const result = toLspDiagnostic({
      diagnostic: makeDiagnostic({ severity: 'error' }),
      text: null,
    });
    expect(result.severity).toBe(DiagnosticSeverity.Error);
    expect(result.code).toBe('vue-doctor/template/v-for-has-key');
    expect(result.source).toBe('doctor');
    expect(result.codeDescription).toEqual({
      href: docsUrl('vue-doctor/template/v-for-has-key'),
    });
    expect(result.message).toBe('missing key');
  });

  it('builds a 0-based single-character range from 1-indexed line/column without text', () => {
    const result = toLspDiagnostic({
      diagnostic: makeDiagnostic(),
      text: null,
    });
    expect(result.range.start).toEqual({ line: 8, character: 12 });
    expect(result.range.end).toEqual({ line: 8, character: 13 });
  });

  it('honors explicit endLine/endColumn from the core diagnostic', () => {
    const diagnostic = makeDiagnostic({
      line: 3,
      column: 5,
      endLine: 3,
      endColumn: 20,
    });
    const result = toLspDiagnostic({ diagnostic, text: null });
    expect(result.range).toEqual({
      start: { line: 2, character: 4 },
      end: { line: 2, character: 19 },
    });
  });

  it('extends the range to end-of-line when document text is supplied', () => {
    const text = 'line one\n<div v-for="x in xs" />\nline three';
    const diagnostic = makeDiagnostic({ line: 2, column: 1 });
    const result = toLspDiagnostic({ diagnostic, text });
    expect(result.range.start).toEqual({ line: 1, character: 0 });
    expect(result.range.end.character).toBe('<div v-for="x in xs" />'.length);
  });
});
