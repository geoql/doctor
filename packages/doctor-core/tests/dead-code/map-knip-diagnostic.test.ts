import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mapKnipDiagnostic } from '../../src/dead-code/map-knip-diagnostic.js';
import type { KnipIssue } from '../../src/dead-code/types.js';

const root = '/project/app';

describe('mapKnipDiagnostic', () => {
  it('maps unused file (files kind)', () => {
    const issue: KnipIssue = { file: 'src/old.ts', kind: 'files' };
    const d = mapKnipDiagnostic(root, issue);
    expect(d).toEqual({
      file: resolve(root, 'src/old.ts'),
      line: 1,
      column: 1,
      ruleId: 'dead-code/unused-file',
      severity: 'warn',
      message: 'Unused file',
      source: 'dead-code',
    });
  });

  it('maps unused export (exports kind)', () => {
    const issue: KnipIssue = {
      file: 'src/utils.ts',
      symbol: 'formatDate',
      kind: 'exports',
    };
    const d = mapKnipDiagnostic(root, issue);
    expect(d).not.toBeNull();
    expect(d!.ruleId).toBe('dead-code/unused-export');
    expect(d!.severity).toBe('warn');
    expect(d!.message).toBe('Unused export: formatDate');
    expect(d!.source).toBe('dead-code');
  });

  it('maps unused type export (types kind)', () => {
    const issue: KnipIssue = {
      file: 'src/types.ts',
      symbol: 'User',
      kind: 'types',
    };
    const d = mapKnipDiagnostic(root, issue);
    expect(d).not.toBeNull();
    expect(d!.ruleId).toBe('dead-code/unused-type-export');
    expect(d!.severity).toBe('info');
  });

  it('maps unused enum member (enumMembers kind)', () => {
    const issue: KnipIssue = {
      file: 'src/enums.ts',
      symbol: 'Status.Active',
      kind: 'enumMembers',
    };
    const d = mapKnipDiagnostic(root, issue);
    expect(d).not.toBeNull();
    expect(d!.ruleId).toBe('dead-code/unused-member');
    expect(d!.severity).toBe('info');
  });

  it('maps unused namespace member (namespaceMembers kind)', () => {
    const issue: KnipIssue = {
      file: 'src/ns.ts',
      symbol: 'NS.helper',
      kind: 'namespaceMembers',
    };
    const d = mapKnipDiagnostic(root, issue);
    expect(d).not.toBeNull();
    expect(d!.ruleId).toBe('dead-code/unused-member');
    expect(d!.severity).toBe('info');
  });

  it('maps unused dependency (deps kind)', () => {
    const issue: KnipIssue = {
      file: 'package.json',
      symbol: 'lodash',
      kind: 'deps',
    };
    const d = mapKnipDiagnostic(root, issue);
    expect(d).not.toBeNull();
    expect(d!.ruleId).toBe('dead-code/unused-dependency');
    expect(d!.severity).toBe('warn');
  });

  it('maps unused devDependency (devDependencies kind)', () => {
    const issue: KnipIssue = {
      file: 'package.json',
      symbol: 'jest',
      kind: 'devDependencies',
    };
    const d = mapKnipDiagnostic(root, issue);
    expect(d).not.toBeNull();
    expect(d!.ruleId).toBe('dead-code/unused-dependency');
    expect(d!.severity).toBe('warn');
  });

  it('maps unlisted dependency (unlisted kind)', () => {
    const issue: KnipIssue = {
      file: 'src/app.ts',
      symbol: 'lodash',
      kind: 'unlisted',
    };
    const d = mapKnipDiagnostic(root, issue);
    expect(d).not.toBeNull();
    expect(d!.ruleId).toBe('dead-code/unlisted-dependency');
    expect(d!.severity).toBe('error');
  });

  it('maps duplicate export (duplicates kind)', () => {
    const issue: KnipIssue = {
      file: 'src/index.ts',
      symbol: 'foo',
      kind: 'duplicates',
    };
    const d = mapKnipDiagnostic(root, issue);
    expect(d).not.toBeNull();
    expect(d!.ruleId).toBe('dead-code/duplicate-export');
    expect(d!.severity).toBe('warn');
  });

  it('returns null for unmapped kinds', () => {
    const kinds: KnipIssue['kind'][] = [
      'nsExports',
      'nsTypes',
      'optionalPeerDependencies',
      'binaries',
      'unresolved',
      'catalog',
    ];
    for (const kind of kinds) {
      const issue: KnipIssue = { file: 'src/x.ts', kind };
      expect(mapKnipDiagnostic(root, issue)).toBeNull();
    }
  });

  it('uses default line=1 and column=1 when not provided', () => {
    const issue: KnipIssue = { file: 'src/a.ts', kind: 'files' };
    const d = mapKnipDiagnostic(root, issue);
    expect(d!.line).toBe(1);
    expect(d!.column).toBe(1);
  });

  it('uses provided line and col', () => {
    const issue: KnipIssue = {
      file: 'src/a.ts',
      symbol: 'fn',
      line: 42,
      col: 5,
      kind: 'exports',
    };
    const d = mapKnipDiagnostic(root, issue);
    expect(d!.line).toBe(42);
    expect(d!.column).toBe(5);
  });

  it('produces absolute file paths', () => {
    const issue: KnipIssue = { file: 'src/deep/mod.ts', kind: 'files' };
    const d = mapKnipDiagnostic(root, issue);
    expect(d!.file).toBe(resolve(root, 'src/deep/mod.ts'));
    expect(d!.file.startsWith('/')).toBe(true);
  });
});
