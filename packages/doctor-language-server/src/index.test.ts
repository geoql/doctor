import { describe, expect, it } from 'vitest';
import * as namedExports from './index.js';
import { api } from './index.js';

describe('public api', () => {
  it('re-exports the server entry points and pure transforms as named bindings', () => {
    expect(typeof namedExports.startLanguageServer).toBe('function');
    expect(typeof namedExports.createServer).toBe('function');
    expect(typeof namedExports.createScheduler).toBe('function');
    expect(typeof namedExports.createVersionCache).toBe('function');
    expect(typeof namedExports.shouldAuditVersion).toBe('function');
    expect(typeof namedExports.groupDiagnosticsByUri).toBe('function');
    expect(typeof namedExports.toLspDiagnostic).toBe('function');
    expect(typeof namedExports.rangeFromLineColumn).toBe('function');
    expect(typeof namedExports.rangesOverlap).toBe('function');
    expect(typeof namedExports.toZeroBasedPosition).toBe('function');
    expect(typeof namedExports.severityLabel).toBe('function');
    expect(typeof namedExports.toLspSeverity).toBe('function');
    expect(typeof namedExports.isAuditableProject).toBe('function');
    expect(typeof namedExports.selectProjectKind).toBe('function');
    expect(typeof namedExports.diagnosticFileToUri).toBe('function');
    expect(typeof namedExports.uriToFsPath).toBe('function');
  });

  it('re-exports the shared constants', () => {
    expect(namedExports.DIAGNOSTIC_SOURCE).toBe('doctor');
    expect(namedExports.SERVER_DISPLAY_NAME).toBe('Doctor');
    expect(namedExports.DOCUMENT_CHANGE_DEBOUNCE_MS).toBeGreaterThan(0);
    expect(namedExports.INITIAL_WORKSPACE_SCAN_DELAY_MS).toBeGreaterThan(0);
    expect(namedExports.SCANNABLE_EXTENSIONS).toContain('.vue');
  });

  it('exposes the same surface as the frozen `api` namespace object', () => {
    expect(Object.keys(api).sort()).toEqual(
      [
        'DOCUMENT_CHANGE_DEBOUNCE_MS',
        'DIAGNOSTIC_SOURCE',
        'INITIAL_WORKSPACE_SCAN_DELAY_MS',
        'SCANNABLE_EXTENSIONS',
        'SERVER_DISPLAY_NAME',
        'createScheduler',
        'createServer',
        'createVersionCache',
        'diagnosticFileToUri',
        'groupDiagnosticsByUri',
        'isAuditableProject',
        'rangeFromLineColumn',
        'rangesOverlap',
        'selectProjectKind',
        'severityLabel',
        'shouldAuditVersion',
        'startLanguageServer',
        'toLspDiagnostic',
        'toLspSeverity',
        'toZeroBasedPosition',
        'uriToFsPath',
      ].sort(),
    );
    expect(api.DIAGNOSTIC_SOURCE).toBe('doctor');
  });
});
