import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { run } from '../src/cli.js';

const here = dirname(fileURLToPath(import.meta.url));
const workspaceDir = resolve(here, 'fixtures/workspace');

describe('run --project', () => {
  let stdout: string[];
  let stderr: string[];
  let originalExitCode: typeof process.exitCode;

  beforeEach(() => {
    stdout = [];
    stderr = [];
    originalExitCode = process.exitCode;
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      stdout.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: unknown) => {
      stderr.push(String(chunk));
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.exitCode = originalExitCode;
  });

  it('audits only the named project and exits 0 for a clean one', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      '--project',
      'a',
      '--no-dead-code',
      '--json',
      workspaceDir,
    ]);

    expect(code).toBe(0);
    const report = JSON.parse(stdout.join(''));
    expect(report.score.value).toBe(100);
    expect(report.diagnostics).toEqual([]);
  });

  it('aggregates diagnostics across multiple named projects with the worst exit code', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      '--project',
      'a,b',
      '--no-dead-code',
      '--json',
      workspaceDir,
    ]);

    expect(code).toBe(1);
    const report = JSON.parse(stdout.join(''));
    expect(report.diagnostics.length).toBe(2);
    expect(report.score.bySeverity.error).toBe(2);
    expect(report.projectInfo.rootDirectory).toBe(workspaceDir);
    const ruleIds = report.diagnostics.map((d: { ruleId: string }) => d.ruleId);
    expect(ruleIds).toContain('vue-doctor/template/v-for-has-key');
  }, 40000);

  it('warns on an unknown project and exits 2 when nothing matches', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      '--project',
      'nope',
      '--no-dead-code',
      workspaceDir,
    ]);

    expect(code).toBe(2);
    expect(stderr.join('')).toContain(
      'vue-doctor: --project: unknown project "nope" (skipped)',
    );
    expect(stderr.join('')).toContain(
      'vue-doctor: --project: no matching workspace projects',
    );
  });

  it('warns then skips an unknown project but still aggregates the known ones', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      '--project',
      'a,ghost',
      '--no-dead-code',
      '--json',
      workspaceDir,
    ]);

    expect(code).toBe(0);
    expect(stderr.join('')).toContain(
      'vue-doctor: --project: unknown project "ghost" (skipped)',
    );
    const report = JSON.parse(stdout.join(''));
    expect(report.score.value).toBe(100);
  }, 40000);

  it('ignores --project on a non-workspace directory and runs a normal single audit', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vue-doctor-project-'));
    try {
      writeFileSync(join(dir, 'package.json'), '{"name":"solo"}\n');
      writeFileSync(
        join(dir, 'App.vue'),
        '<template>\n  <div />\n</template>\n',
      );

      const code = await run([
        'node',
        'vue-doctor',
        '--project',
        'x',
        '--no-dead-code',
        '--json',
        dir,
      ]);

      expect(code).toBe(0);
      expect(stderr.join('')).toContain(
        'vue-doctor: --project ignored: not a pnpm workspace',
      );
      const report = JSON.parse(stdout.join(''));
      expect(report.score.value).toBe(100);
      expect(report.projectInfo.rootDirectory).toBe(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('emits aggregate JSON for a single named project', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      '--project',
      'a',
      '--no-dead-code',
      '--json',
      workspaceDir,
    ]);

    expect(code).toBe(0);
    const report = JSON.parse(stdout.join(''));
    expect(report.schemaVersion).toBe('1');
    expect(report.projectInfo.rootDirectory).toBe(workspaceDir);
  }, 40000);

  it('prints only the aggregate integer score with --score', async () => {
    const code = await run([
      'node',
      'vue-doctor',
      '--project',
      'a,b',
      '--no-dead-code',
      '--score',
      workspaceDir,
    ]);

    expect(code).toBe(1);
    expect(stdout.join('')).toBe('91\n');
  }, 40000);
});
