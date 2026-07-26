import { isAbsolute, relative } from 'node:path';
import { RULE_REGISTRY } from './rule-registry.js';
import type { Diagnostic, Severity } from './types.js';

/**
 * The 6 fields the SaaS receives for each finding.
 * Everything else (message, codeSnippet, recommendation, etc.) is privacy-sensitive
 * and MUST be stripped before transmission.
 */
export interface PushedFinding {
  file: string;
  line: number;
  col: number;
  ruleId: string;
  severity: Severity;
  category: string;
}

export interface PushPayloadInput {
  project: string;
  score: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  /** Monorepo sub-app path (e.g. "packages/v-maplibre"); omitted = single-app repo. */
  workspace?: string;
  findings: PushedFinding[];
}

export interface PushPayload extends PushPayloadInput {
  commitSha?: string;
  branch?: string;
  prNumber?: number;
}

export interface PushOptions {
  project: string;
  /** Monorepo sub-app path forwarded to the SaaS so two frameworks in one repo keep separate score series. */
  workspace?: string;
  score: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  diagnostics: Diagnostic[];
  /** Project root used to relativize absolute finding file paths. */
  rootDir?: string;
  url: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
  /** Overrides for the request timeout (ms). Defaults to 5000. Test-only. */
  timeoutMs?: number;
}

export type PushResult =
  | { ok: true; status?: number; error?: undefined }
  | { ok: false; status?: number; error: string };

const PUSH_TIMEOUT_MS = 5000;

const categoryByRuleId: ReadonlyMap<string, string> = new Map(
  RULE_REGISTRY.map((r) => [r.id, r.category]),
);

function lookupCategory(ruleId: string): string {
  return categoryByRuleId.get(ruleId) ?? 'unknown';
}

function toRepoRelative(file: string, rootDir: string | undefined): string {
  if (!rootDir || !isAbsolute(file)) return file;
  const rel = relative(rootDir, file);
  // Paths outside rootDir would relativize to ../../… which is more
  // confusing (and more revealing) than the original — keep those as-is.
  if (rel.startsWith('..')) return file;
  return rel;
}

/**
 * Strip a list of Diagnostics down to the 6 allowed push fields.
 * Privacy boundary: this function is the single point of enforcement.
 * If you add a new privacy-sensitive field to Diagnostic, add it to the deny list here.
 *
 * Absolute file paths are relativized against rootDir so dashboards show
 * `src/Foo.vue` rather than the CI runner's `/home/runner/work/<repo>/…`.
 */
export function stripFindings(
  diagnostics: Diagnostic[],
  rootDir?: string,
): PushedFinding[] {
  const out: PushedFinding[] = new Array(diagnostics.length);
  for (let i = 0; i < diagnostics.length; i++) {
    const d = diagnostics[i]!;
    out[i] = {
      file: toRepoRelative(d.file, rootDir),
      line: d.line,
      col: d.column,
      ruleId: d.ruleId,
      severity: d.severity,
      category: lookupCategory(d.ruleId),
    };
  }
  return out;
}

function readOptionalEnv(name: string): string | undefined {
  const v = process.env[name];
  return v === undefined || v === '' ? undefined : v;
}

function readPrNumber(): number | undefined {
  const raw = readOptionalEnv('GITHUB_PR_NUMBER');
  if (raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Build the top-level POST body. CI fields (commitSha, branch, prNumber) are
 * included ONLY when the matching GITHUB_* env var is set.
 */
export function buildPushPayload(input: PushPayloadInput): PushPayload {
  const payload: PushPayload = {
    project: input.project,
    score: input.score,
    errorCount: input.errorCount,
    warnCount: input.warnCount,
    infoCount: input.infoCount,
    findings: input.findings,
  };
  if (input.workspace !== undefined && input.workspace !== '') {
    payload.workspace = input.workspace;
  }
  const commitSha = readOptionalEnv('GITHUB_SHA');
  const branch = readOptionalEnv('GITHUB_REF_NAME');
  const prNumber = readPrNumber();
  if (commitSha !== undefined) payload.commitSha = commitSha;
  if (branch !== undefined) payload.branch = branch;
  if (prNumber !== undefined) payload.prNumber = prNumber;
  return payload;
}

/**
 * Strip + POST findings to a SaaS endpoint. Never throws — returns
 * `{ ok: false, error }` on any HTTP / network failure so the audit's
 * exit code is not affected by SaaS downtime.
 */
export async function pushFindings(opts: PushOptions): Promise<PushResult> {
  const findings = stripFindings(opts.diagnostics, opts.rootDir);
  const payload = buildPushPayload({
    project: opts.project,
    score: opts.score,
    errorCount: opts.errorCount,
    warnCount: opts.warnCount,
    infoCount: opts.infoCount,
    workspace: opts.workspace,
    findings,
  });

  const fetchImpl: typeof fetch = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? PUSH_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref?.();

  try {
    const res = await fetchImpl(opts.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': opts.apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      return { ok: true, status: res.status };
    }
    return {
      ok: false,
      status: res.status,
      error: `HTTP ${res.status} ${res.statusText}`.trim(),
    };
  } catch (err) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
