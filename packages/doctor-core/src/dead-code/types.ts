export interface KnipIssue {
  file: string;
  symbol?: string;
  line?: number;
  col?: number;
  kind: KnipIssueKind;
}

export type KnipIssueKind =
  | 'files'
  | 'exports'
  | 'types'
  | 'deps'
  | 'devDependencies'
  | 'unlisted'
  | 'duplicates'
  | 'enumMembers'
  | 'namespaceMembers'
  | 'nsExports'
  | 'nsTypes'
  | 'optionalPeerDependencies'
  | 'binaries'
  | 'unresolved'
  | 'catalog';
