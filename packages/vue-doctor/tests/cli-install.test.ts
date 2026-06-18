import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
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

const SKILL_REL = join('.agents', 'skills', 'vue-doctor', 'SKILL.md');

describe('vue-doctor install', () => {
  let stdout: string[];
  let stderr: string[];
  let dir: string;
  let originalExitCode: typeof process.exitCode;

  beforeEach(() => {
    stdout = [];
    stderr = [];
    dir = mkdtempSync(join(tmpdir(), 'vue-install-'));
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

  it('writes nothing under --dry-run but prints the target path + content', async () => {
    const { run } = await import('../src/cli.js');
    const code = await run([
      'node',
      'vue-doctor',
      'install',
      '--dry-run',
      '--yes',
      dir,
    ]);
    expect(code).toBe(0);
    const out = stdout.join('');
    expect(out).toContain('[dry-run]');
    expect(out).toContain(join(dir, SKILL_REL));
    expect(out).toContain('name: vue-doctor');
    expect(existsSync(join(dir, SKILL_REL))).toBe(false);
    expect(existsSync(join(dir, '.claude'))).toBe(false);
  });

  it('writes the SKILL.md with correct frontmatter + doctor command under --yes', async () => {
    const { run } = await import('../src/cli.js');
    const code = await run(['node', 'vue-doctor', 'install', '--yes', dir]);
    expect(code).toBe(0);
    const written = readFileSync(join(dir, SKILL_REL), 'utf-8');
    expect(written).toContain('name: vue-doctor');
    expect(written).toContain('Use when finishing a feature');
    expect(written).toContain('before committing Vue');
    expect(written).toMatch(/version:/);
    expect(written).toContain('npx @geoql/vue-doctor@latest --diff --verbose');
    expect(written).toContain('npx @geoql/vue-doctor@latest');
    expect(written).toContain(
      'https://docs.the-doctor.report/prompts/doctor-agent.md',
    );
    expect(written).toContain(
      'https://docs.the-doctor.report/prompts/rules/vue-doctor/',
    );
    expect(stdout.join('')).toContain('wrote');
  });

  it('creates a .claude -> .agents symlink when .claude is absent', async () => {
    const { run } = await import('../src/cli.js');
    const code = await run(['node', 'vue-doctor', 'install', '--yes', dir]);
    expect(code).toBe(0);
    const link = join(dir, '.claude');
    expect(lstatSync(link).isSymbolicLink()).toBe(true);
    expect(readlinkSync(link)).toBe('.agents');
    expect(stdout.join('')).toContain('.claude -> .agents');
  });

  it('does not create a symlink when .claude already exists', async () => {
    mkdirSync(join(dir, '.claude'), { recursive: true });
    const { run } = await import('../src/cli.js');
    const code = await run([
      'node',
      'vue-doctor',
      'install',
      '--yes',
      '--force',
      dir,
    ]);
    expect(code).toBe(0);
    expect(lstatSync(join(dir, '.claude')).isDirectory()).toBe(true);
    expect(existsSync(join(dir, SKILL_REL))).toBe(true);
    expect(stdout.join('')).not.toContain('.claude -> .agents');
  });

  it('is a no-op with a clear message when the skill exists without --force', async () => {
    const { run } = await import('../src/cli.js');
    await run(['node', 'vue-doctor', 'install', '--yes', dir]);
    writeFileSync(join(dir, SKILL_REL), 'CUSTOM CONTENT\n');
    stdout.length = 0;
    stderr.length = 0;
    const code = await run(['node', 'vue-doctor', 'install', '--yes', dir]);
    expect(code).toBe(2);
    expect(stderr.join('')).toContain('already exists');
    expect(readFileSync(join(dir, SKILL_REL), 'utf-8')).toBe(
      'CUSTOM CONTENT\n',
    );
  });

  it('overwrites an existing skill with --force', async () => {
    const { run } = await import('../src/cli.js');
    await run(['node', 'vue-doctor', 'install', '--yes', dir]);
    writeFileSync(join(dir, SKILL_REL), 'CUSTOM CONTENT\n');
    const code = await run([
      'node',
      'vue-doctor',
      'install',
      '--yes',
      '--force',
      dir,
    ]);
    expect(code).toBe(0);
    expect(readFileSync(join(dir, SKILL_REL), 'utf-8')).toContain(
      'name: vue-doctor',
    );
  });

  it('writes after an interactive confirm', async () => {
    mockPromptAdapter.default.mockResolvedValueOnce({ confirm: true });
    const { run } = await import('../src/cli.js');
    const code = await run(['node', 'vue-doctor', 'install', dir]);
    expect(code).toBe(0);
    expect(existsSync(join(dir, SKILL_REL))).toBe(true);
  });

  it('writes nothing when the interactive confirm is declined', async () => {
    mockPromptAdapter.default.mockResolvedValueOnce({ confirm: false });
    const { run } = await import('../src/cli.js');
    const code = await run(['node', 'vue-doctor', 'install', dir]);
    expect(code).toBe(0);
    expect(existsSync(join(dir, SKILL_REL))).toBe(false);
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
    const code = await run(['node', 'vue-doctor', 'install', dir]);
    expect(code).toBe(2);
    expect(existsSync(join(dir, SKILL_REL))).toBe(false);
  });

  it('reports a clear error when the project root is unwritable', async () => {
    const { run } = await import('../src/cli.js');
    const filePath = join(dir, 'blocker');
    writeFileSync(filePath, 'x');
    const code = await run([
      'node',
      'vue-doctor',
      'install',
      '--yes',
      join(filePath, 'nested'),
    ]);
    expect(code).toBe(2);
    expect(stderr.join('')).not.toBe('');
  });

  it('stringifies a non-Error thrown and exits 2', async () => {
    mockPromptAdapter.default.mockImplementationOnce(() => {
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw { toString: () => 'plain str failure' };
    });
    const { run } = await import('../src/cli.js');
    const code = await run(['node', 'vue-doctor', 'install', dir]);
    expect(code).toBe(2);
    expect(stderr.join('')).toContain('plain str failure');
  });

  it('defaults to the current working directory when no [dir] is provided', async () => {
    const originalCwd = process.cwd();
    process.chdir(dir);
    try {
      const { run } = await import('../src/cli.js');
      const code = await run(['node', 'vue-doctor', 'install', '--yes']);
      expect(code).toBe(0);
      expect(existsSync(join(dir, SKILL_REL))).toBe(true);
    } finally {
      process.chdir(originalCwd);
    }
  });
});
