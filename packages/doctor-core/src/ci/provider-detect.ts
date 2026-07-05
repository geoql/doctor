export type CiProvider = 'github' | 'gitlab' | 'unknown';

/**
 * Detects the CI provider from an explicit env snapshot. Takes the env as an
 * argument (instead of reading process.env) so provider detection stays a
 * deterministic, fully-testable pure function.
 */
export function detectCiProvider(
  env: Readonly<Record<string, string | undefined>>,
): CiProvider {
  if (env.GITHUB_ACTIONS === 'true') return 'github';
  if (env.GITLAB_CI === 'true') return 'gitlab';
  return 'unknown';
}
