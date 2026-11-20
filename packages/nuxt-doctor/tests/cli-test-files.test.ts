import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { run } from '../src/cli.js';

// Issues #342 / #343: a Nuxt app whose only error is in a test file.
const root = mkdtempSync(join(tmpdir(), 'nuxt-doctor-test-files-'));
const appDir = join(root, 'app-under-test');
mkdirSync(join(appDir, 'app', 'utils'), { recursive: true });
mkdirSync(join(appDir, 'app', 'pages'), { recursive: true });
writeFileSync(
  join(appDir, 'package.json'),
  JSON.stringify({
    name: 'app-under-test',
    private: true,
    type: 'module',
    dependencies: { nuxt: '^4.2.0', vue: '^3.5.0' },
  }),
);
writeFileSync(
  join(appDir, 'nuxt.config.ts'),
  "export default defineNuxtConfig({\n  compatibilityDate: '2026-01-01',\n  app: { head: { htmlAttrs: { lang: 'en' } } },\n});\n",
);
writeFileSync(
  join(appDir, 'app', 'pages', 'index.vue'),
  '<template><div>hi</div></template>\n',
);
writeFileSync(
  join(appDir, 'app', 'utils', 'render.test.ts'),
  "import { it } from 'vitest';\nit('renders', () => {\n  const el = document.createElement('div');\n  el.innerHTML = '<details></details>';\n});\n",
);

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

const CI_ENV_KEYS = ['CI', 'GITHUB_ACTIONS', 'DOCTOR_API_KEY'] as const;

interface JsonReport {
  counts: { listed: number; scored: number; unscoredTestFiles: number };
  score: { bySeverity: { error: number; warn: number; info: number } };
  diagnostics: Array<{ ruleId: string; surface?: string }>;
}

describe('nuxt-doctor test-file findings (#342, #343)', () => {
  let stdout: string[];
  let savedEnv: Record<string, string | undefined>;
  let originalExitCode: typeof process.exitCode;

  beforeEach(() => {
    stdout = [];
    originalExitCode = process.exitCode;
    savedEnv = {};
    for (const k of CI_ENV_KEYS) {
      savedEnv[k] = process.env[k];
      delete process.env[k];
    }
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      stdout.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = originalExitCode;
    for (const k of CI_ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
  });

  const audit = (...extra: string[]) =>
    run(['node', 'nuxt-doctor', appDir, '--no-dead-code', ...extra]);

  it('agent summary states listed, scored and the unscored test findings', async () => {
    const code = await audit('--fail-on', 'error');
    expect(code).toBe(0);
    const out = stdout.join('');
    expect(out).toContain('vue-doctor/security/no-inner-html');
    expect(out).toMatch(
      /FINDINGS: (\d+) listed · \d+ scored \(0 error, \d+ warn, \d+ info\) · 1 in test files, not scored or gated \(use --include-test-files\)/,
    );
  });

  it('json counts agree with the listed findings and the severity counts', async () => {
    await audit('--format', 'json');
    const report = JSON.parse(stdout.join('')) as JsonReport;
    const { error, warn, info } = report.score.bySeverity;
    expect(report.counts.listed).toBe(report.diagnostics.length);
    expect(report.counts.scored).toBe(error + warn + info);
    expect(report.counts.unscoredTestFiles).toBe(
      report.diagnostics.filter((d) => d.surface === 'test').length,
    );
    expect(report.counts.unscoredTestFiles).toBe(1);
    expect(report.counts.listed - report.counts.unscoredTestFiles).toBe(
      report.counts.scored,
    );
  });

  it('counts test findings and fails the gate with --include-test-files', async () => {
    const code = await audit('--include-test-files', '--format', 'json');
    expect(code).toBe(1);
    const report = JSON.parse(stdout.join('')) as JsonReport;
    expect(report.counts.unscoredTestFiles).toBe(0);
    expect(report.counts.scored).toBe(report.counts.listed);
    expect(report.score.bySeverity.error).toBe(1);
  });

  it('sarif carries the same counts and marks the test result unscored', async () => {
    const sarifFile = join(root, 'out.sarif');
    await audit('--format', 'json', '--sarif-output', sarifFile);
    const json = JSON.parse(stdout.join('')) as JsonReport;
    const sarif = JSON.parse(readFileSync(sarifFile, 'utf8'));
    expect(sarif.runs[0].properties.counts).toEqual(json.counts);
    const testResult = sarif.runs[0].results.find(
      (r: { ruleId: string }) =>
        r.ruleId === 'vue-doctor/security/no-inner-html',
    );
    expect(testResult.properties).toEqual({ surface: 'test', scored: false });
  });

  it('pushes only the scored findings, matching the pushed counts', async () => {
    const captured: string[] = [];
    const server: Server = createServer(
      (req: IncomingMessage, res: ServerResponse) => {
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', () => {
          captured.push(Buffer.concat(chunks).toString('utf-8'));
          res.writeHead(200);
          res.end('{}');
        });
      },
    );
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const { port } = server.address() as AddressInfo;
    try {
      await audit(
        '--push',
        '--api-key',
        'k',
        '--push-url',
        `http://127.0.0.1:${port}/api/v1/findings`,
      );
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
    const body = JSON.parse(captured[0]!) as {
      errorCount: number;
      warnCount: number;
      infoCount: number;
      findings: Array<{ ruleId: string }>;
    };
    expect(body.findings.length).toBe(
      body.errorCount + body.warnCount + body.infoCount,
    );
    expect(body.findings.map((f) => f.ruleId)).not.toContain(
      'vue-doctor/security/no-inner-html',
    );
  });
});

describe('nuxt-doctor gate on test-file findings (#342)', () => {
  let stdout: string[];
  let originalExitCode: typeof process.exitCode;

  beforeEach(() => {
    stdout = [];
    originalExitCode = process.exitCode;
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      stdout.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = originalExitCode;
  });

  it('annotates the ungated test-file error as a notice', async () => {
    const code = await run([
      'node',
      'nuxt-doctor',
      appDir,
      '--no-dead-code',
      '--annotations',
      '--fail-on',
      'error',
    ]);
    expect(code).toBe(0);
    const out = stdout.join('');
    expect(out).toContain(
      'title=vue-doctor/security/no-inner-html (test file%2C not gated)::',
    );
    expect(out).not.toMatch(/::error [^\n]*no-inner-html/);
  });

  it('--project scores and counts the same findings the gate sees', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'nuxt-doctor-ws-'));
    try {
      writeFileSync(join(ws, 'package.json'), '{"name":"ws","private":true}\n');
      writeFileSync(
        join(ws, 'pnpm-workspace.yaml'),
        'packages:\n  - packages/*\n',
      );
      cpSync(appDir, join(ws, 'packages', 'app-under-test'), {
        recursive: true,
      });
      const single = await run([
        'node',
        'nuxt-doctor',
        appDir,
        '--no-dead-code',
        '--format',
        'json',
      ]);
      const singleReport = JSON.parse(stdout.join('')) as JsonReport & {
        score: { value: number };
      };
      stdout.length = 0;
      const code = await run([
        'node',
        'nuxt-doctor',
        ws,
        '--project',
        'app-under-test',
        '--no-dead-code',
        '--format',
        'json',
        '--fail-on',
        'error',
      ]);
      const report = JSON.parse(stdout.join('')) as JsonReport & {
        score: { value: number };
      };
      expect(code).toBe(single);
      expect(code).toBe(0);
      expect(report.score.bySeverity.error).toBe(0);
      expect(report.score.value).toBe(singleReport.score.value);
      expect(report.counts).toEqual(singleReport.counts);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });
});
