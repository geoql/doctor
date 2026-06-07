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
  findings: PushedFinding[];
}

export interface PushPayload extends PushPayloadInput {
  commitSha?: string;
  branch?: string;
  prNumber?: number;
}

export interface PushOptions {
  project: string;
  score: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  diagnostics: Diagnostic[];
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

/**
 * Strip a list of Diagnostics down to the 6 allowed push fields.
 * Privacy boundary: this function is the single point of enforcement.
 * If you add a new privacy-sensitive field to Diagnostic, add it to the deny list here.
 */
export function stripFindings(diagnostics: Diagnostic[]): PushedFinding[] {
  const out: PushedFinding[] = new Array(diagnostics.length);
  for (let i = 0; i < diagnostics.length; i++) {
    const d = diagnostics[i]!;
    out[i] = {
      file: d.file,
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
  const findings = stripFindings(opts.diagnostics);
  const payload = buildPushPayload({
    project: opts.project,
    score: opts.score,
    errorCount: opts.errorCount,
    warnCount: opts.warnCount,
    infoCount: opts.infoCount,
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
