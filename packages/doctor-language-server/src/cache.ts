/**
 * Per-document version cache. The LSP `TextDocument.version` increments on
 * every edit, so a request to audit a `(uri, version)` pair already audited
 * (or in flight) is redundant. `shouldAudit` is the pure decision; the
 * server records the version it acted on via `markAudited`.
 */
export interface VersionCache {
  /** Whether `uri` at `version` warrants a fresh audit (not already seen). */
  readonly shouldAudit: (uri: string, version: number) => boolean;
  /** Records that `uri` was audited at `version`. */
  readonly markAudited: (uri: string, version: number) => void;
  /** Forgets a document (on close) so a later reopen always re-audits. */
  readonly forget: (uri: string) => void;
}

/** Pure decision: audit only when this version is newer than the last seen. */
export const shouldAuditVersion = (
  lastAuditedVersion: number | undefined,
  version: number,
): boolean => lastAuditedVersion === undefined || version > lastAuditedVersion;

export const createVersionCache = (): VersionCache => {
  const lastAudited = new Map<string, number>();
  return {
    shouldAudit: (uri, version) =>
      shouldAuditVersion(lastAudited.get(uri), version),
    markAudited: (uri, version) => {
      lastAudited.set(uri, version);
    },
    forget: (uri) => {
      lastAudited.delete(uri);
    },
  };
};
