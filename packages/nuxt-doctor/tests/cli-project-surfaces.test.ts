import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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

// A `--project` roll-up must score, gate, count and push exactly what a
// single-project run of the same workspace package does, under any
// `surfaces` config.
const INNER_HTML = 'vue-doctor/security/no-inner-html';
const VUE_TSC = 'vue-doctor/build-quality/vue-tsc-in-devDeps';

const root = mkdtempSync(join(tmpdir(), 'nuxt-doctor-project-surfaces-'));

function workspace(name: string, config: object): string {
  const ws = join(root, name);
  const app = join(ws, 'packages', 'app');
  mkdirSync(join(app, 'app', 'utils'), { recursive: true });
  mkdirSync(join(app, 'app', 'pages'), { recursive: true });
  writeFileSync(join(ws, 'package.json'), '{"name":"ws","private":true}\n');
  writeFileSync(join(ws, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
  writeFileSync(
    join(app, 'package.json'),
    JSON.stringify({
      name: 'app',
      private: true,
      type: 'module',
      dependencies: { nuxt: '^4.2.0', vue: '^3.5.0' },
    }),
  );
  writeFileSync(
    join(app, 'nuxt.config.ts'),
    "export default defineNuxtConfig({\n  compatibilityDate: '2026-01-01',\n  app: { head: { htmlAttrs: { lang: 'en' } } },\n});\n",
  );
  writeFileSync(
    join(app, 'app', 'pages', 'index.vue'),
    '<template><div>hi</div></template>\n',
  );
  writeFileSync(
    join(app, 'app', 'utils', 'render.ts'),
    "export function render(el: HTMLElement) {\n  el.innerHTML = '<details></details>';\n}\n",
  );
  writeFileSync(join(app, 'doctor.config.json'), JSON.stringify(config));
  return ws;
}

const scoreWs = workspace('score', {
  surfaces: { score: { excludeRules: [INNER_HTML] } },
});
const gateWs = workspace('gate', {
  surfaces: { ciGate: { excludeRules: [INNER_HTML] } },
});
const prWs = workspace('pr', {
  surfaces: { prComment: { excludeRules: [VUE_TSC] } },
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

interface JsonReport {
  score: {
    value: number;
    bySeverity: { error: number; warn: number; info: number };
  };
  counts: { listed: number; scored: number; unscoredTestFiles: number };
  diagnostics: Array<{ ruleId: string }>;
}

interface PushBody {
  score: number;
  errorCount: number;
  warnCount: number;
  infoCount: number;
  findings: Array<{ ruleId: string }>;
}

describe('nuxt-doctor --project honours each workspace surfaces config', () => {
  let stdout: string[];
  let originalExitCode: typeof process.exitCode;
  let savedCi: string | undefined;

  beforeEach(() => {
    stdout = [];
    originalExitCode = process.exitCode;
    savedCi = process.env.CI;
    delete process.env.CI;
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      stdout.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = originalExitCode;
    if (savedCi === undefined) delete process.env.CI;
    else process.env.CI = savedCi;
  });

  const single = (ws: string, ...extra: string[]) =>
    run([
      'node',
      'nuxt-doctor',
      join(ws, 'packages', 'app'),
      '--no-dead-code',
      '--no-ci',
      ...extra,
    ]);
  const project = (ws: string, ...extra: string[]) =>
    run([
      'node',
      'nuxt-doctor',
      ws,
      '--project',
      'app',
      '--no-dead-code',
      '--no-ci',
      ...extra,
    ]);

  async function capture(
    call: () => Promise<number>,
  ): Promise<{ code: number; out: string }> {
    stdout.length = 0;
    const code = await call();
    return { code, out: stdout.join('') };
  }

  async function pushed(call: (url: string) => Promise<number>) {
    let body = '';
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => {
        body = Buffer.concat(chunks).toString('utf-8');
        res.writeHead(200);
        res.end('{}');
      });
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const { port } = server.address() as AddressInfo;
    try {
      await call(`http://127.0.0.1:${port}/x`);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
    return JSON.parse(body) as PushBody;
  }

  it('surfaces.score: same score, counts and exit code as a single run', async () => {
    const one = await capture(() => single(scoreWs, '--json'));
    const all = await capture(() => project(scoreWs, '--json'));
    const a = JSON.parse(one.out) as JsonReport;
    const b = JSON.parse(all.out) as JsonReport;
    expect(a.score.bySeverity.error).toBe(0);
    expect(a.counts).toEqual({ listed: 2, scored: 1, unscoredTestFiles: 0 });
    expect(b.score).toEqual(a.score);
    expect(b.counts).toEqual(a.counts);
    const ruleIds = (r: JsonReport) => r.diagnostics.map((d) => d.ruleId);
    expect(ruleIds(b)).toEqual(ruleIds(a));
    expect(all.code).toBe(one.code);
  });

  it('surfaces.score: pushes only the scored findings, matching the counts', async () => {
    const push = (target: typeof single, ws: string) => (url: string) =>
      target(ws, '--quiet', '--push', '--api-key', 'k', '--push-url', url);
    const a = await pushed(push(single, scoreWs));
    const b = await pushed(push(project, scoreWs));
    expect(a.findings.map((f) => f.ruleId)).toEqual([VUE_TSC]);
    expect(a.findings.length).toBe(a.errorCount + a.warnCount + a.infoCount);
    const summary = (p: PushBody) => ({
      score: p.score,
      counts: [p.errorCount, p.warnCount, p.infoCount],
      ruleIds: p.findings.map((f) => f.ruleId),
    });
    expect(summary(b)).toEqual(summary(a));
  });

  it('surfaces.ciGate: the roll-up gates on the same findings', async () => {
    const one = await capture(() =>
      single(gateWs, '--quiet', '--warning-exit-code', '78'),
    );
    const all = await capture(() =>
      project(gateWs, '--quiet', '--warning-exit-code', '78'),
    );
    expect(one.code).toBe(78);
    expect(all.code).toBe(one.code);
  });

  it('surfaces.prComment: same score and body as a single run', async () => {
    const one = await capture(() => single(prWs, '--format', 'pr-comment'));
    const all = await capture(() => project(prWs, '--format', 'pr-comment'));
    expect(one.out).toContain('Score: 93');
    expect(one.out).not.toContain(VUE_TSC);
    expect(all.out.replaceAll('packages/app/', '')).toBe(one.out);
    expect(all.code).toBe(one.code);
  });
});
