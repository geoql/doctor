import { resolve } from 'node:path';
import type { Diagnostic, Severity } from '../types.js';
import type { KnipIssue, KnipIssueKind } from './types.js';

const KIND_MAP: Record<
  KnipIssueKind,
  { ruleId: string; severity: Severity; message: string } | null
> = {
  files: {
    ruleId: 'dead-code/unused-file',
    severity: 'warn',
    message: 'Unused file',
  },
  exports: {
    ruleId: 'dead-code/unused-export',
    severity: 'warn',
    message: 'Unused export',
  },
  types: {
    ruleId: 'dead-code/unused-type-export',
    severity: 'info',
    message: 'Unused type export',
  },
  enumMembers: {
    ruleId: 'dead-code/unused-member',
    severity: 'info',
    message: 'Unused enum member',
  },
  namespaceMembers: {
    ruleId: 'dead-code/unused-member',
    severity: 'info',
    message: 'Unused namespace member',
  },
  deps: {
    ruleId: 'dead-code/unused-dependency',
    severity: 'warn',
    message: 'Unused dependency',
  },
  devDependencies: {
    ruleId: 'dead-code/unused-dependency',
    severity: 'warn',
    message: 'Unused devDependency',
  },
  unlisted: {
    ruleId: 'dead-code/unlisted-dependency',
    severity: 'error',
    message: 'Unlisted dependency',
  },
  duplicates: {
    ruleId: 'dead-code/duplicate-export',
    severity: 'warn',
    message: 'Duplicate export',
  },
  nsExports: null,
  nsTypes: null,
  optionalPeerDependencies: null,
  binaries: null,
  unresolved: null,
  catalog: null,
};

export function mapKnipDiagnostic(
  rootDirectory: string,
  issue: KnipIssue,
): Diagnostic | null {
  const mapping = KIND_MAP[issue.kind];
  if (!mapping) return null;

  return {
    file: resolve(rootDirectory, issue.file),
    line: issue.line ?? 1,
    column: issue.col ?? 1,
    ruleId: mapping.ruleId,
    severity: mapping.severity,
    message: issue.symbol
      ? `${mapping.message}: ${issue.symbol}`
      : mapping.message,
    source: 'dead-code',
  };
}
