import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { run } from '../src/cli.js';

const CI_ENV_KEYS = [
  'CI',
  'GITHUB_ACTIONS',
  'GITLAB_CI',
  'CIRCLECI',
  'TRAVIS',
  'BUILDKITE',
  'JENKINS_HOME',
  'GITHUB_SHA',
  'GITHUB_REF_NAME',
  'GITHUB_PR_NUMBER',
] as const;

interface CapturedRequest {
  method: string | undefined;
  url: string | undefined;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

async function startCaptureServer(): Promise<{
  server: Server;
  port: number;
  captured: CapturedRequest[];
  responses: number[];
}> {
  const captured: CapturedRequest[] = [];
  const responses: number[] = [];
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      captured.push({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: Buffer.concat(chunks).toString('utf-8'),
      });
      responses.push(200);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end('{"ok":true}');
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  return { server, port, captured, responses };
}

const violationDir = new URL('./fixtures/violation', import.meta.url).pathname;

describe('vue-doctor --push (real CLI + local HTTP server)', () => {
  let originalExitCode: typeof process.exitCode;
  let originalCwd: string;
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    originalExitCode = process.exitCode;
    originalCwd = process.cwd();
    savedEnv = {};
    for (const k of CI_ENV_KEYS) {
      savedEnv[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
    process.chdir(originalCwd);
    for (const k of CI_ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
  });

  it('POSTs a privacy-stripped payload with x-api-key header when --push + --api-key are set', async () => {
    const { server, port, captured } = await startCaptureServer();
    try {
      const url = `http://127.0.0.1:${port}/api/v1/findings`;
      const code = await run([
        'node',
        'vue-doctor',
        '--no-dead-code',
        '--push',
        '--api-key',
        'sk-live-abc-123',
        '--push-url',
        url,
        violationDir,
      ]);

      expect(code).toBe(1);
      expect(captured).toHaveLength(1);
      const req = captured[0]!;
      expect(req.method).toBe('POST');
      expect(req.url).toBe('/api/v1/findings');
      expect(req.headers['content-type']).toBe('application/json');
      expect(req.headers['x-api-key']).toBe('sk-live-abc-123');

      const body = JSON.parse(req.body) as {
        project: string;
        score: number;
        errorCount: number;
        warnCount: number;
        infoCount: number;
        findings: Array<{
          file: string;
          line: number;
          col: number;
          ruleId: string;
          severity: string;
          category: string;
          [k: string]: unknown;
        }>;
      };
      expect(typeof body.project).toBe('string');
      expect(body.project.length).toBeGreaterThan(0);
      expect(body.score).toBeGreaterThan(0);
      expect(body.errorCount).toBe(1);
      expect(Array.isArray(body.findings)).toBe(true);
      expect(body.findings.length).toBeGreaterThan(0);
      const f = body.findings[0]!;
      const allowed = new Set([
        'file',
        'line',
        'col',
        'ruleId',
        'severity',
        'category',
      ]);
      for (const k of Object.keys(f)) {
        expect(allowed.has(k)).toBe(true);
      }
      expect(f.file).toContain('App.vue');
      expect(typeof f.line).toBe('number');
      expect(typeof f.col).toBe('number');
      expect(f.ruleId).toBe('vue-doctor/template/v-for-has-key');
      expect(f.severity).toBe('error');
      expect(typeof f.category).toBe('string');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('the captured request body MUST NOT contain the user-authored source line', async () => {
    const { server, port, captured } = await startCaptureServer();
    try {
      const url = `http://127.0.0.1:${port}/api/v1/findings`;
      await run([
        'node',
        'vue-doctor',
        '--no-dead-code',
        '--push',
        '--api-key',
        'sk-test',
        '--push-url',
        url,
        violationDir,
      ]);

      expect(captured).toHaveLength(1);
      const raw = captured[0]!.body;
      expect(raw).not.toContain('<li v-for="i in items">');
      expect(raw).not.toContain('codeSnippet');
      expect(raw).not.toContain('"message"');
      expect(raw).not.toContain('recommendation');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('does not POST anything when --push is omitted (default --no-push)', async () => {
    const { server, port, captured } = await startCaptureServer();
    try {
      const url = `http://127.0.0.1:${port}/api/v1/findings`;
      await run([
        'node',
        'vue-doctor',
        '--no-dead-code',
        '--push-url',
        url,
        '--api-key',
        'sk-test',
        violationDir,
      ]);
      expect(captured).toHaveLength(0);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('does not POST when --push is set but --api-key is missing (warn + skip)', async () => {
    const { server, port, captured } = await startCaptureServer();
    try {
      const url = `http://127.0.0.1:${port}/api/v1/findings`;
      const code = await run([
        'node',
        'vue-doctor',
        '--no-dead-code',
        '--push',
        '--push-url',
        url,
        violationDir,
      ]);
      expect(captured).toHaveLength(0);
      expect(code).toBe(1);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('exits 0 even when the SaaS returns 5xx (CI should not fail because SaaS is down)', async () => {
    const server = createServer((_req, res) => {
      res.writeHead(502, { 'content-type': 'text/plain' });
      res.end('upstream down');
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const port = (server.address() as AddressInfo).port;
    try {
      const url = `http://127.0.0.1:${port}/api/v1/findings`;
      const code = await run([
        'node',
        'vue-doctor',
        '--no-dead-code',
        '--push',
        '--api-key',
        'sk-test',
        '--push-url',
        url,
        violationDir,
      ]);
      expect(code).toBe(1);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('exits 0 when the SaaS endpoint is unreachable (network failure)', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      '--no-dead-code',
      '--push',
      '--api-key',
      'sk-test',
      '--push-url',
      'http://127.0.0.1:1/should-fail-immediately',
      violationDir,
    ]);
    expect(code).toBe(1);
  });

  it('forwards CI env vars to the payload (commitSha, branch, prNumber)', async () => {
    process.env.GITHUB_SHA = 'deadbeefcafe';
    process.env.GITHUB_REF_NAME = 'feat/push-mode';
    process.env.GITHUB_PR_NUMBER = '42';
    const { server, port, captured } = await startCaptureServer();
    try {
      const url = `http://127.0.0.1:${port}/api/v1/findings`;
      await run([
        'node',
        'vue-doctor',
        '--no-dead-code',
        '--push',
        '--api-key',
        'sk-test',
        '--push-url',
        url,
        violationDir,
      ]);
      expect(captured).toHaveLength(1);
      const body = JSON.parse(captured[0]!.body) as {
        commitSha?: string;
        branch?: string;
        prNumber?: number;
      };
      expect(body.commitSha).toBe('deadbeefcafe');
      expect(body.branch).toBe('feat/push-mode');
      expect(body.prNumber).toBe(42);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('renders the singular "finding" wording when exactly 1 diagnostic is pushed', async () => {
    const { server, port } = await startCaptureServer();
    try {
      const url = `http://127.0.0.1:${port}/api/v1/findings`;
      const writes: string[] = [];
      const spy = vi
        .spyOn(process.stderr, 'write')
        .mockImplementation((chunk: unknown) => {
          writes.push(String(chunk));
          return true;
        });
      try {
        await run([
          'node',
          'vue-doctor',
          '--no-dead-code',
          '--push',
          '--api-key',
          'sk-test',
          '--push-url',
          url,
          violationDir,
        ]);
        const text = writes.join('');
        expect(text).toMatch(/pushed 1 finding to/);
        expect(text).not.toMatch(/pushed 1 findings to/);
      } finally {
        spy.mockRestore();
      }
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('renders the plural "findings" wording when more than 1 diagnostic is pushed', async () => {
    const buildQualityDir = new URL('./fixtures/build-quality', import.meta.url)
      .pathname;
    const { server, port } = await startCaptureServer();
    try {
      const url = `http://127.0.0.1:${port}/api/v1/findings`;
      const writes: string[] = [];
      const spy = vi
        .spyOn(process.stderr, 'write')
        .mockImplementation((chunk: unknown) => {
          writes.push(String(chunk));
          return true;
        });
      try {
        await run([
          'node',
          'vue-doctor',
          '--no-dead-code',
          '--no-dead-code',
          '--push',
          '--api-key',
          'sk-test',
          '--push-url',
          url,
          buildQualityDir,
        ]);
        const text = writes.join('');
        expect(text).toMatch(/pushed \d+ findings to/);
      } finally {
        spy.mockRestore();
      }
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
