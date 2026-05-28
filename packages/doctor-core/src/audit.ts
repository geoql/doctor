import type { AuditConfig, AuditReport } from './types.js';

export async function audit(_config: AuditConfig = {}): Promise<AuditReport> {
  throw new Error(
    'doctor-core: audit() not yet implemented; see docs/ARCHITECTURE.md for the locked two-pass design.',
  );
}
