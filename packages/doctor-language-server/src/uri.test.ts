import { describe, expect, it } from 'vitest';
import { diagnosticFileToUri, uriToFsPath } from './uri.js';

describe('diagnosticFileToUri', () => {
  it('resolves a relative file against the audit root', () => {
    const uri = diagnosticFileToUri('/repo', 'src/App.vue');
    expect(uri).toBe('file:///repo/src/App.vue');
  });

  it('keeps an already-absolute file path', () => {
    const uri = diagnosticFileToUri('/repo', '/elsewhere/Foo.vue');
    expect(uri).toBe('file:///elsewhere/Foo.vue');
  });
});

describe('uriToFsPath', () => {
  it('round-trips a file URI back to an absolute path', () => {
    const uri = diagnosticFileToUri('/repo', 'src/App.vue');
    expect(uriToFsPath(uri)).toBe('/repo/src/App.vue');
  });
});
