import { existsSync } from 'node:fs';
import { chmod, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { audit } from '../src/audit.js';
import { runOxlint } from '../src/oxlint/spawn.js';
import {
  buildDoctorReport,
  DOCTOR_REPORT_SCHEMA_VERSION,
  jsonReport,
} from '../src/reporters/json.js';
import type { ReporterInput } from '../src/reporters/types.js';
import { scoreDiagnostics } from '../src/score.js';
import type { OxlintRunOptions } from '../src/oxlint/types.js';

async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-maxdur-'));
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, name), content);
  }
  return dir;
}

async function fakeBin(body: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-maxdur-bin-'));
  const path = join(dir, 'fake-oxlint.sh');
  await writeFile(path, `#!/bin/sh\n${body}\n`);
  await chmod(path, 0o755);
  return path;
}

function spawnOpts(
  oxlintBin: string,
  extra: Partial<OxlintRunOptions> = {},
): OxlintRunOptions {
  return {
    rootDir: tmpdir(),
    targetPath: tmpdir(),
    configPath: '/tmp/.oxlintrc.json',
    oxlintBin,
    ...extra,
  };
}

async function isDead(pid: number): Promise<boolean> {
  for (let i = 0; i < 100; i += 1) {
    try {
      process.kill(pid, 0);
    } catch {
      return true;
    }
    await delay(20);
  }
  return false;
}

async function readPid(pidFile: string): Promise<number> {
  for (let i = 0; i < 100; i += 1) {
    if (existsSync(pidFile)) {
      const raw = (await readFile(pidFile, 'utf8')).trim();
      if (raw) return Number(raw);
    }
    await delay(20);
  }
  throw new Error('pid file never written');
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock('../src/template/run.js');
  vi.resetModules();
});

describe('audit --max-duration: budget not hit', () => {
  it('reports incomplete=false and no skippedCheckReasons', async () => {
    const dir = await fixture({
      'clean.vue': '<template><div /></template>\n',
    });
    const report = await audit({
      rootDir: dir,
      maxDurationMs: 60_000,
      deadCode: false,
    });
    expect(report.incomplete).toBe(false);
    expect(report.skippedCheckReasons).toBeUndefined();
    expect(typeof report.score).toBe('number');
  });

  it('reports incomplete=false when no maxDurationMs is configured', async () => {
    const dir = await fixture({
      'clean.vue': '<template><div /></template>\n',
    });
    const report = await audit({ rootDir: dir, deadCode: false });
    expect(report.incomplete).toBe(false);
    expect(report.skippedCheckReasons).toBeUndefined();
  });
});

describe('audit --max-duration: deadline already exhausted', () => {
  it('skips every pass, marks incomplete, preserves score as a number', async () => {
    const dir = await fixture({
      'bad.vue': '<template><li v-for="i in items">{{ i }}</li></template>\n',
    });
    const report = await audit({ rootDir: dir, maxDurationMs: 0 });
    expect(report.incomplete).toBe(true);
    expect(report.skippedCheckReasons).toBeDefined();
    const reason = report.skippedCheckReasons![0]!;
    expect(reason.kind).toBe('time-budget-exhausted');
    expect(reason.deadlineMs).toBe(0);
    expect(reason.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(reason.skippedPasses).toContain('template');
    expect(reason.skippedPasses).toContain('sfc');
    expect(reason.skippedPasses).toContain('lint');
    expect(reason.skippedPasses).toContain('dead-code');
    expect(reason.skippedPasses).toContain('project');
    // Score stays a number over the (empty) collected diagnostics.
    expect(typeof report.score).toBe('number');
    expect(report.score).toBe(100);
    // Exit code follows the existing threshold/fail-on math — no new code.
    expect(report.exitCode).toBe(0);
    expect(report.diagnostics).toEqual([]);
  });
});

describe('audit --max-duration: deadline trips mid-run', () => {
  it('keeps already-collected diagnostics and skips the remaining passes', async () => {
    // Deterministic clock: time only advances when the template pass "runs",
    // so the budget is provably intact before template and exhausted after.
    let fakeNow = 0;
    const { performance: perf } = await import('node:perf_hooks');
    vi.spyOn(perf, 'now').mockImplementation(() => fakeNow);
    vi.doMock('../src/template/run.js', () => ({
      runTemplatePass: vi.fn(async (opts: { files: string[] }) => {
        fakeNow += 1000;
        return [
          {
            file: opts.files[0] ?? '/x/App.vue',
            line: 1,
            column: 1,
            ruleId: 'vue-doctor/template/v-for-has-key',
            severity: 'error' as const,
            message: 'v-for without key',
            source: 'template' as const,
          },
        ];
      }),
    }));
    const { audit: mockedAudit } = await import('../src/audit.js');
    const dir = await fixture({
      'bad.vue': '<template><li v-for="i in items">{{ i }}</li></template>\n',
    });
    const report = await mockedAudit({ rootDir: dir, maxDurationMs: 500 });
    expect(report.incomplete).toBe(true);
    const reason = report.skippedCheckReasons![0]!;
    expect(reason.skippedPasses).not.toContain('template');
    expect(reason.skippedPasses).toContain('sfc');
    expect(reason.skippedPasses).toContain('lint');
    expect(reason.skippedPasses).toContain('dead-code');
    expect(reason.skippedPasses).toContain('project');
    // The template diagnostics collected before the deadline survive.
    expect(
      report.diagnostics.some(
        (d) => d.ruleId === 'vue-doctor/template/v-for-has-key',
      ),
    ).toBe(true);
    expect(typeof report.score).toBe('number');
    expect(report.score).toBeLessThan(100);
    // failOn=error (default) over the PARTIAL diagnostics still exits 1.
    expect(report.exitCode).toBe(1);
  });
});

describe('runOxlint abort signal', () => {
  it('SIGKILLs the child when the signal aborts mid-run', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-maxdur-abort-'));
    const pidFile = join(dir, 'pid');
    const bin = await fakeBin(`echo $$ > '${pidFile}'\nsleep 5\nprintf '[]'`);
    const controller = new AbortController();
    const pending = runOxlint(
      spawnOpts(bin, { signal: controller.signal, timeoutMs: 30_000 }),
    );
    const pid = await readPid(pidFile);
    controller.abort();
    await expect(pending).rejects.toThrow(/aborted/);
    expect(await isDead(pid)).toBe(true);
  });

  it('rejects immediately when the signal is already aborted', async () => {
    const bin = await fakeBin(`printf '[]'`);
    const controller = new AbortController();
    controller.abort();
    await expect(
      runOxlint(spawnOpts(bin, { signal: controller.signal })),
    ).rejects.toThrow(/aborted/);
  });
});

describe('audit --max-duration: oxlint aborted mid-pass', () => {
  it('converts the abort into a lint skip reason without exit code 2', async () => {
    // Freeze the perf clock so budgetExhausted() stays false and the lint
    // pass always ENTERS; only the real deadline timer can abort it. This
    // pins coverage on the catch-side abort branch instead of the pass-entry
    // skip, deterministically.
    const { performance: perf } = await import('node:perf_hooks');
    vi.spyOn(perf, 'now').mockReturnValue(0);
    vi.doMock('../src/oxlint/run.js', () => ({
      runScriptPass: vi.fn(
        async (opts: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            const signal = opts.signal;
            if (!signal) {
              reject(new Error('expected an abort signal to be threaded'));
              return;
            }
            if (signal.aborted) {
              reject(new Error('oxlint subprocess aborted'));
              return;
            }
            signal.addEventListener(
              'abort',
              () => reject(new Error('oxlint subprocess aborted')),
              { once: true },
            );
          }),
      ),
    }));
    const { audit: mockedAudit } = await import('../src/audit.js');
    const dir = await fixture({
      'clean.vue': '<template><div /></template>\n',
    });
    const report = await mockedAudit({
      rootDir: dir,
      maxDurationMs: 100,
      deadCode: false,
    });
    expect(report.incomplete).toBe(true);
    const reason = report.skippedCheckReasons![0]!;
    expect(reason.skippedPasses).toContain('lint');
    // The abort is NOT disguised as an oxlint failure: exit code stays 0.
    expect(report.exitCode).toBe(0);
    expect(typeof report.score).toBe('number');
    vi.doUnmock('../src/oxlint/run.js');
  });
});

describe('JSON reporter incomplete + skippedCheckReasons', () => {
  function reporterInput(partial: boolean): ReporterInput {
    return {
      toolName: '@geoql/vue-doctor',
      toolVersion: '0.1.0',
      rootDirectory: '/proj',
      analyzedFileCount: 1,
      elapsedMs: 10,
      diagnostics: [],
      score: scoreDiagnostics([]),
      projectInfo: {
        framework: 'vue',
        frameworkDetected: true,
        vueVersion: '3.5.0',
        nuxtVersion: null,
        capabilities: [],
        rootDirectory: '/proj',
      },
      ...(partial
        ? {
            incomplete: true,
            skippedCheckReasons: [
              {
                kind: 'time-budget-exhausted' as const,
                deadlineMs: 1000,
                elapsedMs: 1024,
                skippedPasses: ['lint', 'dead-code'],
              },
            ],
          }
        : {}),
    };
  }

  it('emits incomplete + skippedCheckReasons when present', () => {
    const parsed = JSON.parse(jsonReport(reporterInput(true))) as {
      incomplete: boolean;
      skippedCheckReasons: Array<{
        kind: string;
        deadlineMs: number;
        elapsedMs: number;
        skippedPasses: string[];
      }>;
    };
    expect(parsed.incomplete).toBe(true);
    expect(parsed.skippedCheckReasons).toHaveLength(1);
    expect(parsed.skippedCheckReasons[0]!.kind).toBe('time-budget-exhausted');
    expect(parsed.skippedCheckReasons[0]!.skippedPasses).toEqual([
      'lint',
      'dead-code',
    ]);
  });

  it('omits both fields when not provided (additive-only wire)', () => {
    const out = jsonReport(reporterInput(false));
    expect(out).not.toContain('incomplete');
    expect(out).not.toContain('skippedCheckReasons');
  });

  it('keeps schemaVersion at "1"', () => {
    expect(DOCTOR_REPORT_SCHEMA_VERSION).toBe('1');
    const report = buildDoctorReport(reporterInput(true));
    expect(report.schemaVersion).toBe('1');
  });
});
