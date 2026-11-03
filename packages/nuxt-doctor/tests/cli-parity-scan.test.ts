import { execFileSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { run } from '../src/cli.js';

const here = dirname(fileURLToPath(import.meta.url));
const violationDir = resolve(here, 'fixtures/violation');
const cleanDir = resolve(here, 'fixtures/clean');
const workspaceDir = resolve(here, 'fixtures/workspace');
const BIN = 'nuxt-doctor';
const V_FOR_WARN = 'vue-doctor/template/v-for-has-key:warn';

describe(`${BIN} react.doctor parity — scan surface`, () => {
  let stdout: string[];
  let stderr: string[];
  let originalExitCode: typeof process.exitCode;
  let tmp: string;

  beforeEach(() => {
    stdout = [];
    stderr = [];
    originalExitCode = process.exitCode;
    tmp = realpathSync(mkdtempSync(join(tmpdir(), `${BIN}-parity-`)));
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
    rmSync(tmp, { recursive: true, force: true });
  });

  describe('--warning-exit-code', () => {
    it('rejects an out-of-range code with exit 2', async () => {
      const code = await run([
        'node',
        BIN,
        violationDir,
        '--no-dead-code',
        '--warning-exit-code',
        '1',
      ]);
      expect(code).toBe(2);
      expect(stderr.join('')).toContain(
        '--warning-exit-code must be an integer from 2 to 255',
      );
    });

    it('exits with the warning code when only warnings are found', async () => {
      const code = await run([
        'node',
        BIN,
        violationDir,
        '--no-dead-code',
        '--json',
        '--rule',
        V_FOR_WARN,
        '--warning-exit-code',
        '9',
      ]);
      expect(code).toBe(9);
      expect(JSON.parse(stdout.join('')).score.bySeverity.warn).toBe(1);
    });

    it('also applies when --fail-on warn trips on warnings only', async () => {
      const code = await run([
        'node',
        BIN,
        violationDir,
        '--no-dead-code',
        '--fail-on',
        'warn',
        '--rule',
        V_FOR_WARN,
        '--warning-exit-code',
        '78',
      ]);
      expect(code).toBe(78);
    });

    it('keeps errors at exit 1', async () => {
      const code = await run([
        'node',
        BIN,
        violationDir,
        '--no-dead-code',
        '--warning-exit-code',
        '9',
      ]);
      expect(code).toBe(1);
    });

    it('is ignored with --score and with --fail-on none', async () => {
      const scoreCode = await run([
        'node',
        BIN,
        violationDir,
        '--no-dead-code',
        '--score',
        '--rule',
        V_FOR_WARN,
        '--warning-exit-code',
        '9',
      ]);
      expect(scoreCode).toBe(0);
      const noneCode = await run([
        'node',
        BIN,
        violationDir,
        '--no-dead-code',
        '--fail-on',
        'none',
        '--rule',
        V_FOR_WARN,
        '--warning-exit-code',
        '9',
      ]);
      expect(noneCode).toBe(0);
    });
  });

  describe('positional file arguments', () => {
    beforeEach(() => {
      cpSync(join(violationDir, 'App.vue'), join(tmp, 'Bad.vue'));
      mkdirSync(join(tmp, 'ok'));
      cpSync(join(cleanDir, 'app', 'app.vue'), join(tmp, 'ok', 'Good.vue'));
      vi.spyOn(process, 'cwd').mockReturnValue(tmp);
    });

    it('scans only the given clean file', async () => {
      const code = await run([
        'node',
        BIN,
        'ok/Good.vue',
        '--no-dead-code',
        '--json',
      ]);
      expect(code).toBe(0);
      expect(JSON.parse(stdout.join('')).diagnostics).toEqual([]);
    });

    it('reports findings for the given files and directories only', async () => {
      const code = await run([
        'node',
        BIN,
        'Bad.vue',
        'ok',
        '--no-dead-code',
        '--json',
      ]);
      expect(code).toBe(1);
      const report = JSON.parse(stdout.join(''));
      expect(report.diagnostics.map((d: { file: string }) => d.file)).toEqual([
        'Bad.vue',
      ]);
    });

    it('intersects with --diff/--staged scope', async () => {
      execFileSync('git', ['init', '-q'], { cwd: tmp });
      execFileSync('git', ['add', 'Bad.vue'], { cwd: tmp });
      const stagedOnly = await run([
        'node',
        BIN,
        'ok/Good.vue',
        'ok',
        '--staged',
        '--no-dead-code',
        '--json',
      ]);
      expect(stagedOnly).toBe(0);
      expect(JSON.parse(stdout.join('')).diagnostics).toEqual([]);
      stdout.length = 0;
      const both = await run([
        'node',
        BIN,
        'Bad.vue',
        'ok/Good.vue',
        '--staged',
        '--no-dead-code',
        '--json',
      ]);
      expect(both).toBe(1);
      expect(
        JSON.parse(stdout.join('')).diagnostics.map(
          (d: { file: string }) => d.file,
        ),
      ).toEqual(['Bad.vue']);
    });

    it('exits 2 on a missing file', async () => {
      const code = await run(['node', BIN, 'Bad.vue', 'missing.vue']);
      expect(code).toBe(2);
      expect(stderr.join('')).toContain('path "missing.vue" does not exist.');
    });
  });

  describe('nested workspace exclusion', () => {
    it('does not descend into nested workspace projects from the root', async () => {
      const code = await run([
        'node',
        BIN,
        workspaceDir,
        '--no-dead-code',
        '--json',
      ]);
      expect(code).toBe(0);
      expect(JSON.parse(stdout.join('')).diagnostics).toEqual([]);
      expect(stderr.join('')).toContain(
        `${BIN}: skipped 2 nested workspace projects (a, b); audit them with --project <name>`,
      );
    });

    it('stays silent under --quiet', async () => {
      await run(['node', BIN, workspaceDir, '--no-dead-code', '--quiet']);
      expect(stderr.join('')).not.toContain('nested workspace');
    });

    it('scans a nested project when one of its files is selected', async () => {
      vi.spyOn(process, 'cwd').mockReturnValue(workspaceDir);
      const code = await run([
        'node',
        BIN,
        'packages/b/App.vue',
        '--no-dead-code',
        '--json',
      ]);
      expect(code).toBe(1);
      const report = JSON.parse(stdout.join(''));
      expect(report.diagnostics).toHaveLength(2);
      expect(stderr.join('')).toContain(
        'skipped 1 nested workspace project (a)',
      );
    });
  });

  describe('ci install from a nested package', () => {
    it('writes the workflow at the git root with working-directory', async () => {
      execFileSync('git', ['init', '-q'], { cwd: tmp });
      const pkgDir = join(tmp, 'apps', 'web');
      mkdirSync(pkgDir, { recursive: true });
      const code = await run(['node', BIN, 'ci', 'install', pkgDir, '--yes']);
      expect(code).toBe(0);
      const workflow = readFileSync(
        join(tmp, '.github', 'workflows', 'doctor.yml'),
        'utf8',
      );
      expect(workflow).toContain('working-directory: apps/web');
    });

    it('writes at the root without working-directory from the root itself', async () => {
      execFileSync('git', ['init', '-q'], { cwd: tmp });
      const code = await run(['node', BIN, 'ci', 'install', tmp, '--yes']);
      expect(code).toBe(0);
      const workflow = readFileSync(
        join(tmp, '.github', 'workflows', 'doctor.yml'),
        'utf8',
      );
      expect(workflow).not.toContain('working-directory');
    });

    it('falls back to the given directory when it does not exist yet', async () => {
      const missing = join(tmp, 'new-app');
      const code = await run([
        'node',
        BIN,
        'ci',
        'install',
        missing,
        '--yes',
        '--dry-run',
      ]);
      expect(code).toBe(0);
      expect(stdout.join('')).toContain(
        join(missing, '.github', 'workflows', 'doctor.yml'),
      );
    });
  });
});

describe('nuxt-doctor kebab boolean flags before a positional', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not swallow the directory after --dry-run', async () => {
    const out: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      out.push(String(chunk));
      return true;
    });
    const dir = realpathSync(mkdtempSync(join(tmpdir(), 'nuxt-doctor-argv-')));
    try {
      expect(
        await run(['node', 'nuxt-doctor', 'install', '--dry-run', dir]),
      ).toBe(0);
      expect(out.join('')).toContain(join(dir, '.agents'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
