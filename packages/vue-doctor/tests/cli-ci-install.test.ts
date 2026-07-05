import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockPromptAdapter = vi.hoisted(() => ({
  default: vi.fn<() => Promise<{ confirm: boolean }>>(),
}));

vi.mock('prompts', () => mockPromptAdapter);

const WORKFLOW_REL = join('.github', 'workflows', 'doctor.yml');
const PR_WORKFLOW_REL = join('.github', 'workflows', 'doctor-pr.yml');

describe('vue-doctor ci install', () => {
  let stdout: string[];
  let stderr: string[];
  let dir: string;
  let originalExitCode: typeof process.exitCode;

  beforeEach(() => {
    stdout = [];
    stderr = [];
    dir = mkdtempSync(join(tmpdir(), 'vue-ci-install-'));
    originalExitCode = process.exitCode;
    mockPromptAdapter.default.mockReset();
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
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes nothing under --dry-run but prints the workflow content', async () => {
    const { run } = await import('../src/cli.js');
    const code = await run([
      'node',
      'vue-doctor',
      'ci',
      'install',
      '--dry-run',
      '--yes',
      dir,
    ]);
    expect(code).toBe(0);
    const out = stdout.join('');
    expect(out).toContain('[dry-run]');
    expect(out).toContain(join(dir, WORKFLOW_REL));
    expect(out).toContain('uses: geoql/doctor-action@v2');
    expect(existsSync(join(dir, WORKFLOW_REL))).toBe(false);
  });

  it('writes the GitHub workflow under --yes', async () => {
    const { run } = await import('../src/cli.js');
    const code = await run([
      'node',
      'vue-doctor',
      'ci',
      'install',
      '--yes',
      dir,
    ]);
    expect(code).toBe(0);
    const written = readFileSync(join(dir, WORKFLOW_REL), 'utf-8');
    expect(written).toContain('uses: geoql/doctor-action@v2');
    expect(written).toContain('framework: vue');
    expect(written).toContain('api-key: ${{ secrets.DOCTOR_API_KEY }}');
    expect(stdout.join('')).toContain('wrote');
  });

  it('scaffolds the PR-review workflow too with --pr', async () => {
    const { run } = await import('../src/cli.js');
    const code = await run([
      'node',
      'vue-doctor',
      'ci',
      'install',
      '--pr',
      '--yes',
      dir,
    ]);
    expect(code).toBe(0);
    expect(existsSync(join(dir, WORKFLOW_REL))).toBe(true);
    const pr = readFileSync(join(dir, PR_WORKFLOW_REL), 'utf-8');
    expect(pr).toContain('uses: geoql/doctor-action@v2');
    expect(pr).toContain("diff: 'true'");
  });

  it('disables PR comments with --no-comments', async () => {
    const { run } = await import('../src/cli.js');
    const code = await run([
      'node',
      'vue-doctor',
      'ci',
      'install',
      '--no-comments',
      '--yes',
      dir,
    ]);
    expect(code).toBe(0);
    const written = readFileSync(join(dir, WORKFLOW_REL), 'utf-8');
    expect(written).toContain("pr-comment: 'false'");
  });

  it('writes .gitlab-ci.yml with --provider gitlab', async () => {
    const { run } = await import('../src/cli.js');
    const code = await run([
      'node',
      'vue-doctor',
      'ci',
      'install',
      '--provider',
      'gitlab',
      '--yes',
      dir,
    ]);
    expect(code).toBe(0);
    const written = readFileSync(join(dir, '.gitlab-ci.yml'), 'utf-8');
    expect(written).toContain('npx -y @geoql/vue-doctor@latest');
    expect(existsSync(join(dir, WORKFLOW_REL))).toBe(false);
  });

  it('rejects an invalid --provider with exit 2', async () => {
    const { run } = await import('../src/cli.js');
    const code = await run([
      'node',
      'vue-doctor',
      'ci',
      'install',
      '--provider',
      'circleci',
      '--yes',
      dir,
    ]);
    expect(code).toBe(2);
    expect(stderr.join('')).toContain('--provider');
  });

  it('is a no-op with a clear message when the workflow exists without --force', async () => {
    mkdirSync(join(dir, '.github', 'workflows'), { recursive: true });
    writeFileSync(join(dir, WORKFLOW_REL), 'CUSTOM\n');
    const { run } = await import('../src/cli.js');
    const code = await run([
      'node',
      'vue-doctor',
      'ci',
      'install',
      '--yes',
      dir,
    ]);
    expect(code).toBe(2);
    expect(stderr.join('')).toContain('already exists');
    expect(readFileSync(join(dir, WORKFLOW_REL), 'utf-8')).toBe('CUSTOM\n');
  });

  it('overwrites an existing workflow with --force', async () => {
    mkdirSync(join(dir, '.github', 'workflows'), { recursive: true });
    writeFileSync(join(dir, WORKFLOW_REL), 'CUSTOM\n');
    const { run } = await import('../src/cli.js');
    const code = await run([
      'node',
      'vue-doctor',
      'ci',
      'install',
      '--yes',
      '--force',
      dir,
    ]);
    expect(code).toBe(0);
    expect(readFileSync(join(dir, WORKFLOW_REL), 'utf-8')).toContain(
      'uses: geoql/doctor-action@v2',
    );
  });

  it('writes after an interactive confirm', async () => {
    mockPromptAdapter.default.mockResolvedValueOnce({ confirm: true });
    const { run } = await import('../src/cli.js');
    const code = await run(['node', 'vue-doctor', 'ci', 'install', dir]);
    expect(code).toBe(0);
    expect(existsSync(join(dir, WORKFLOW_REL))).toBe(true);
  });

  it('writes nothing when the interactive confirm is declined', async () => {
    mockPromptAdapter.default.mockResolvedValueOnce({ confirm: false });
    const { run } = await import('../src/cli.js');
    const code = await run(['node', 'vue-doctor', 'ci', 'install', dir]);
    expect(code).toBe(0);
    expect(existsSync(join(dir, WORKFLOW_REL))).toBe(false);
    expect(stdout.join('')).toContain('cancelled');
  });

  it('exits 2 when the interactive prompt is cancelled', async () => {
    mockPromptAdapter.default.mockImplementation(
      (_q: unknown, opts?: { onCancel?: () => void }) => {
        opts?.onCancel?.();
        return Promise.resolve({ confirm: false });
      },
    );
    const { run } = await import('../src/cli.js');
    const code = await run(['node', 'vue-doctor', 'ci', 'install', dir]);
    expect(code).toBe(2);
    expect(existsSync(join(dir, WORKFLOW_REL))).toBe(false);
  });

  it('rejects unknown ci actions like upgrade with exit 2', async () => {
    const { run } = await import('../src/cli.js');
    const code = await run(['node', 'vue-doctor', 'ci', 'upgrade', dir]);
    expect(code).toBe(2);
    expect(stderr.join('')).toContain("unknown action 'upgrade'");
  });

  it('rejects ci config with exit 2', async () => {
    const { run } = await import('../src/cli.js');
    const code = await run(['node', 'vue-doctor', 'ci', 'config', dir]);
    expect(code).toBe(2);
    expect(stderr.join('')).toContain("unknown action 'config'");
  });

  it('defaults to the current working directory when no [dir] is given', async () => {
    const originalCwd = process.cwd();
    process.chdir(dir);
    try {
      const { run } = await import('../src/cli.js');
      const code = await run(['node', 'vue-doctor', 'ci', 'install', '--yes']);
      expect(code).toBe(0);
      expect(existsSync(join(dir, WORKFLOW_REL))).toBe(true);
    } finally {
      process.chdir(originalCwd);
    }
  });

  it('stringifies a non-Error thrown and exits 2', async () => {
    mockPromptAdapter.default.mockImplementationOnce(() => {
      throw { toString: () => 'plain ci failure' };
    });
    const { run } = await import('../src/cli.js');
    const code = await run(['node', 'vue-doctor', 'ci', 'install', dir]);
    expect(code).toBe(2);
    expect(stderr.join('')).toContain('plain ci failure');
  });

  it('reports a clear error and exits 2 when the write fails', async () => {
    const { run } = await import('../src/cli.js');
    const blocker = join(dir, 'blocker');
    writeFileSync(blocker, 'x');
    const code = await run([
      'node',
      'vue-doctor',
      'ci',
      'install',
      '--yes',
      join(blocker, 'nested'),
    ]);
    expect(code).toBe(2);
    expect(stderr.join('')).not.toBe('');
  });
});
