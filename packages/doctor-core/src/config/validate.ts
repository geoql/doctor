import { z } from 'zod';
import { DoctorUserConfigSchema } from './schema.js';
import { InvalidConfigError } from './errors.js';

/**
 * Render a single zod issue into the historical hand-rolled message format
 * (`<path>: <message>`), so InvalidConfigError.message stays backward-compatible
 * with callers that assert on substrings like `threshold`, `failOn`, or
 * `rules.foo/bar`. A root-level issue (empty path) maps to the legacy
 * `config: must be an object` wording.
 */
function formatIssue(issue: z.core.$ZodIssue): string {
  if (issue.path.length === 0) {
    return 'config: must be an object';
  }
  const path = issue.path.map((segment) => String(segment)).join('.');
  return `${path}: ${issue.message}`;
}

/**
 * Validate a raw, untrusted config object against the zod schema — the single
 * source of truth. Throws {@link InvalidConfigError} (carrying the full zod
 * issue list) on the first failure, mirroring the legacy validator's
 * throw-on-first-error contract.
 */
export function validateConfig(raw: unknown): void {
  const result = DoctorUserConfigSchema.safeParse(raw);
  if (result.success) return;
  const { issues } = result.error;
  throw new InvalidConfigError(formatIssue(issues[0]!), issues);
}
