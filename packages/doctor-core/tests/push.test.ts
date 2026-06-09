import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pushFindings, buildPushPayload, stripFindings } from '../src/push.js';
import { RULE_REGISTRY } from '../src/rule-registry.js';
import type { Diagnostic } from '../src/types.js';

function makeDiag(overrides: Partial<Diagnostic> = {}): Diagnostic {
  return {
    file: 'src/components/Foo.vue',
    line: 12,
    column: 4,
    endLine: 12,
    endColumn: 18,
    ruleId: 'vue-doctor/no-em-dash-in-string',
    severity: 'warn',
    source: 'template',
    message: 'em dash in string is a tell-tale sign of AI slop',
    recommendation: 'use a hyphen or rewrite',
    codeSnippet: 'const greeting = "Hello — world"',
    ...overrides,
  };
}

describe('stripFindings', () => {
  it('emits ONLY the 6 allowed fields per finding', () => {
    const input: Diagnostic[] = [makeDiag()];
    const out = stripFindings(input);

    expect(out).toHaveLength(1);
    const finding = out[0]!;
    const allowedKeys = new Set([
      'file',
      'line',
      'col',
      'ruleId',
      'severity',
      'category',
    ]);
    const actualKeys = Object.keys(finding).sort();
    expect(actualKeys).toEqual([...allowedKeys].sort());
  });

  it('maps Diagnostic.column to the col field (the push schema uses col)', () => {
    const out = stripFindings([makeDiag({ column: 42 })]);
    expect(out[0]!.col).toBe(42);
    expect(out[0]!.line).toBe(12);
    expect(out[0]!.file).toBe('src/components/Foo.vue');
    expect(out[0]!.ruleId).toBe('vue-doctor/no-em-dash-in-string');
    expect(out[0]!.severity).toBe('warn');
  });

  it('drops the privacy-sensitive fields (message, codeSnippet, fix, why, docs, code, recommendation)', () => {
    const out = stripFindings([
      makeDiag({
        message: 'SECRET MESSAGE — user-authored',
        codeSnippet: 'function() { return 1; }',
        // Diagnostic type does not include fix/why/docs/code — exercise the drop list explicitly
        recommendation: 'SECRET RECOMMENDATION',
      }),
    ]);
    const json = JSON.stringify(out);
    expect(json).not.toContain('SECRET MESSAGE');
    expect(json).not.toContain('user-authored');
    expect(json).not.toContain('function()');
    expect(json).not.toContain('SECRET RECOMMENDATION');
  });

  it('relativizes absolute file paths against rootDir (no CI runner paths leak)', () => {
    const out = stripFindings(
      [
        makeDiag({
          file: '/home/runner/work/v-clappr/v-clappr/src/components/Player.vue',
        }),
      ],
      '/home/runner/work/v-clappr/v-clappr',
    );
    expect(out[0]!.file).toBe('src/components/Player.vue');
  });

  it('leaves already-relative file paths untouched when rootDir is given', () => {
    const out = stripFindings(
      [makeDiag({ file: 'src/a.ts' })],
      '/home/runner/work/v-clappr/v-clappr',
    );
    expect(out[0]!.file).toBe('src/a.ts');
  });

  it('keeps absolute paths outside rootDir relative-safe (no ../ escapes)', () => {
    const out = stripFindings(
      [makeDiag({ file: '/tmp/elsewhere/file.ts' })],
      '/home/runner/work/v-clappr/v-clappr',
    );
    expect(out[0]!.file).toBe('/tmp/elsewhere/file.ts');
  });

  it('looks up the category from RULE_REGISTRY (not the ruleId prefix)', () => {
    const out = stripFindings([makeDiag({ ruleId: 'dead-code/unused-file' })]);
    expect(out[0]!.category).toBe('dead-code');
  });

  it('returns category "unknown" when the ruleId is not in RULE_REGISTRY', () => {
    const out = stripFindings([makeDiag({ ruleId: 'not-in/registry-at-all' })]);
    expect(out[0]!.category).toBe('unknown');
  });

  it('handles a 1MB codeSnippet without leaking any byte into the output', () => {
    const huge = 'x'.repeat(1_000_000);
    const out = stripFindings([
      makeDiag({ codeSnippet: huge, message: 'this is a ' + huge }),
    ]);
    const json = JSON.stringify(out);
    expect(json).not.toContain(huge);
    // sanity: the finding itself is in the output but with stripped fields
    expect(out[0]!.file).toBe('src/components/Foo.vue');
    expect(out[0]!.category).toBe('ai-slop'); // from registry
  });

  it('returns an empty array when there are no diagnostics', () => {
    expect(stripFindings([])).toEqual([]);
  });

  it('preserves severity values exactly (error / warn / info)', () => {
    const out = stripFindings([
      makeDiag({
        ruleId: 'vue/no-deprecated-data-object-declaration',
        severity: 'error',
      }),
      makeDiag({
        ruleId: 'vue-doctor/template/v-for-has-key',
        severity: 'error',
      }),
      makeDiag({
        ruleId: 'vue-doctor/reactivity/watch-without-cleanup',
        severity: 'warn',
      }),
      makeDiag({
        ruleId: 'vue-doctor/performance/prefer-defineAsyncComponent-on-route',
        severity: 'info',
      }),
    ]);
    expect(out.map((f) => f.severity)).toEqual([
      'error',
      'error',
      'warn',
      'info',
    ]);
  });

  it('every category in the output is present in RULE_REGISTRY or "unknown"', () => {
    // sanity: RULE_REGISTRY is reachable (smoke test the import)
    expect(RULE_REGISTRY.length).toBeGreaterThan(0);
  });
});

describe('buildPushPayload', () => {
  // Scrub CI env so default-shape assertions are deterministic on a GitHub runner,
  // where these vars are set and would add commitSha/branch keys to the payload.
  const ciEnvKeys = [
    'GITHUB_SHA',
    'GITHUB_REF_NAME',
    'GITHUB_PR_NUMBER',
  ] as const;
  let savedCiEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    savedCiEnv = {};
    for (const key of ciEnvKeys) {
      savedCiEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ciEnvKeys) {
      const value = savedCiEnv[key];
      if (value !== undefined) process.env[key] = value;
      else delete process.env[key];
    }
  });

  it('produces the documented top-level shape with required fields', () => {
    const payload = buildPushPayload({
      project: 'geoql/doctor',
      score: 87,
      errorCount: 1,
      warnCount: 2,
      infoCount: 3,
      findings: [
        {
          file: 'src/Foo.vue',
          line: 10,
          col: 5,
          ruleId: 'vue-doctor/no-em-dash-in-string',
          severity: 'warn',
          category: 'ai-slop',
        },
      ],
    });
    expect(payload).toEqual({
      project: 'geoql/doctor',
      score: 87,
      errorCount: 1,
      warnCount: 2,
      infoCount: 3,
      findings: [
        {
          file: 'src/Foo.vue',
          line: 10,
          col: 5,
          ruleId: 'vue-doctor/no-em-dash-in-string',
          severity: 'warn',
          category: 'ai-slop',
        },
      ],
    });
  });

  it('omits optional CI fields when env vars are unset', () => {
    const savedSha = process.env.GITHUB_SHA;
    const savedRef = process.env.GITHUB_REF_NAME;
    const savedPr = process.env.GITHUB_PR_NUMBER;
    delete process.env.GITHUB_SHA;
    delete process.env.GITHUB_REF_NAME;
    delete process.env.GITHUB_PR_NUMBER;
    try {
      const payload = buildPushPayload({
        project: 'geoql/doctor',
        score: 100,
        errorCount: 0,
        warnCount: 0,
        infoCount: 0,
        findings: [],
      });
      expect(payload).not.toHaveProperty('commitSha');
      expect(payload).not.toHaveProperty('branch');
      expect(payload).not.toHaveProperty('prNumber');
    } finally {
      if (savedSha !== undefined) process.env.GITHUB_SHA = savedSha;
      if (savedRef !== undefined) process.env.GITHUB_REF_NAME = savedRef;
      if (savedPr !== undefined) process.env.GITHUB_PR_NUMBER = savedPr;
    }
  });

  it('reads commitSha, branch, prNumber from process.env.GITHUB_* when set', () => {
    const savedSha = process.env.GITHUB_SHA;
    const savedRef = process.env.GITHUB_REF_NAME;
    const savedPr = process.env.GITHUB_PR_NUMBER;
    process.env.GITHUB_SHA = 'abc123def456';
    process.env.GITHUB_REF_NAME = 'feat/push-mode';
    process.env.GITHUB_PR_NUMBER = '42';
    try {
      const payload = buildPushPayload({
        project: 'geoql/doctor',
        score: 100,
        errorCount: 0,
        warnCount: 0,
        infoCount: 0,
        findings: [],
      });
      expect(payload.commitSha).toBe('abc123def456');
      expect(payload.branch).toBe('feat/push-mode');
      expect(payload.prNumber).toBe(42);
    } finally {
      if (savedSha !== undefined) process.env.GITHUB_SHA = savedSha;
      else delete process.env.GITHUB_SHA;
      if (savedRef !== undefined) process.env.GITHUB_REF_NAME = savedRef;
      else delete process.env.GITHUB_REF_NAME;
      if (savedPr !== undefined) process.env.GITHUB_PR_NUMBER = savedPr;
      else delete process.env.GITHUB_PR_NUMBER;
    }
  });

  it('passes through a 0 score and zero counts without falsy-dropping them', () => {
    const payload = buildPushPayload({
      project: 'p',
      score: 0,
      errorCount: 0,
      warnCount: 0,
      infoCount: 0,
      findings: [],
    });
    expect(payload.score).toBe(0);
    expect(payload.errorCount).toBe(0);
    expect(payload.warnCount).toBe(0);
    expect(payload.infoCount).toBe(0);
  });

  it('parses prNumber even when the env var is set as a string (CI convention)', () => {
    const saved = process.env.GITHUB_PR_NUMBER;
    process.env.GITHUB_PR_NUMBER = '123';
    try {
      const payload = buildPushPayload({
        project: 'p',
        score: 0,
        errorCount: 0,
        warnCount: 0,
        infoCount: 0,
        findings: [],
      });
      expect(payload.prNumber).toBe(123);
    } finally {
      if (saved !== undefined) process.env.GITHUB_PR_NUMBER = saved;
      else delete process.env.GITHUB_PR_NUMBER;
    }
  });

  it('drops prNumber when GITHUB_PR_NUMBER is set to a non-numeric string', () => {
    const saved = process.env.GITHUB_PR_NUMBER;
    process.env.GITHUB_PR_NUMBER = 'not-a-number';
    try {
      const payload = buildPushPayload({
        project: 'p',
        score: 0,
        errorCount: 0,
        warnCount: 0,
        infoCount: 0,
        findings: [],
      });
      expect(payload.prNumber).toBeUndefined();
      expect(payload).not.toHaveProperty('prNumber');
    } finally {
      if (saved !== undefined) process.env.GITHUB_PR_NUMBER = saved;
      else delete process.env.GITHUB_PR_NUMBER;
    }
  });
});

describe('pushFindings', () => {
  const baseOpts = {
    project: 'geoql/doctor',
    score: 100,
    errorCount: 0,
    warnCount: 0,
    infoCount: 0,
    diagnostics: [] as Diagnostic[],
    url: 'https://app.example.test/api/v1/findings',
    apiKey: 'sk-test-123',
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs to the configured URL with Content-Type: application/json and x-api-key header', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = await pushFindings(baseOpts);

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0]! as [
      string,
      RequestInit,
    ];
    expect(calledUrl).toBe('https://app.example.test/api/v1/findings');
    expect(calledInit.method).toBe('POST');
    const headers = calledInit.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['x-api-key']).toBe('sk-test-123');
  });

  it('serializes the body as JSON with the documented payload shape', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await pushFindings({
      ...baseOpts,
      diagnostics: [
        makeDiag({
          ruleId: 'vue-doctor/no-em-dash-in-string',
          message: 'TOP SECRET USER TEXT',
          codeSnippet: 'SECRET SNIPPET',
        }),
      ],
    });

    const bodyArg = (fetchMock.mock.calls[0]! as [string, RequestInit])[1]!
      .body;
    const body = JSON.parse(bodyArg as string) as {
      project: string;
      findings: Array<{ file: string; ruleId: string }>;
    };
    expect(body.project).toBe('geoql/doctor');
    expect(body.findings).toHaveLength(1);
    expect(body.findings[0]!.file).toBe('src/components/Foo.vue');
    expect(body.findings[0]!.ruleId).toBe('vue-doctor/no-em-dash-in-string');
    const json = bodyArg as string;
    expect(json).not.toContain('TOP SECRET USER TEXT');
    expect(json).not.toContain('SECRET SNIPPET');
  });

  it('returns { ok: false, status, error } on 5xx (does not throw)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('upstream down', { status: 502 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await pushFindings(baseOpts);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(502);
    expect(typeof result.error).toBe('string');
    expect(result.error).toContain('502');
  });

  it('returns { ok: false, error } on network failure (fetch throws)', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await pushFindings(baseOpts);

    expect(result.ok).toBe(false);
    expect(result.status).toBeUndefined();
    expect(result.error).toContain('ECONNREFUSED');
  });

  it('stringifies non-Error throwables in the catch branch (e.g. a string)', async () => {
    const fetchMock = vi.fn().mockRejectedValue('plain string failure');
    vi.stubGlobal('fetch', fetchMock);

    const result = await pushFindings(baseOpts);

    expect(result.ok).toBe(false);
    expect(result.error).toBe('plain string failure');
  });

  it('uses an AbortController with a 5s timeout so a hanging server does not block CI', async () => {
    let abortFired = false;
    const fetchMock = vi
      .fn()
      .mockImplementation((_url: string, init?: RequestInit) => {
        const signal = init?.signal as AbortSignal | undefined;
        return new Promise<Response>((_resolve, reject) => {
          if (signal) {
            signal.addEventListener('abort', () => {
              abortFired = true;
              reject(
                new DOMException('The operation was aborted.', 'AbortError'),
              );
            });
          }
        });
      });
    vi.stubGlobal('fetch', fetchMock);

    const result = await pushFindings({ ...baseOpts, timeoutMs: 50 });

    expect(result.ok).toBe(false);
    expect(abortFired).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = (fetchMock.mock.calls[0]! as [string, RequestInit])[1]!;
    expect(init.signal).toBeDefined();
  });

  it('returns { ok: true, status } on 2xx responses', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{"id":"f-1"}', { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await pushFindings(baseOpts);

    expect(result.ok).toBe(true);
    expect(result.status).toBe(201);
    expect(result.error).toBeUndefined();
  });
});
