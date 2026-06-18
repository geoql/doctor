import { describe, expect, it } from 'vitest';
import { DiagnosticSeverity } from 'vscode-languageserver';
import { severityLabel, toLspSeverity } from './severity.js';

describe('toLspSeverity', () => {
  it('maps error to Error', () => {
    expect(toLspSeverity('error')).toBe(DiagnosticSeverity.Error);
  });

  it('maps warn to Warning', () => {
    expect(toLspSeverity('warn')).toBe(DiagnosticSeverity.Warning);
  });

  it('maps info to Information', () => {
    expect(toLspSeverity('info')).toBe(DiagnosticSeverity.Information);
  });
});

describe('severityLabel', () => {
  it('labels each LSP severity', () => {
    expect(severityLabel(DiagnosticSeverity.Error)).toBe('error');
    expect(severityLabel(DiagnosticSeverity.Warning)).toBe('warning');
    expect(severityLabel(DiagnosticSeverity.Information)).toBe('info');
    expect(severityLabel(DiagnosticSeverity.Hint)).toBe('hint');
  });

  it('defaults an undefined severity to warning', () => {
    expect(severityLabel(undefined)).toBe('warning');
  });
});
