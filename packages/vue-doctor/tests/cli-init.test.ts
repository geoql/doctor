import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const here = import.meta.dirname;
const violationDir = join(here, 'fixtures/violation');

const mockPromptAdapter = vi.hoisted(() => ({
  default: vi.fn<
    () => Promise<{
      target: string;
      preset: string;
      threshold: number | undefined;
      exclude: string;
    }>
  >(),
}));

vi.mock('prompts', () => mockPromptAdapter);

describe('vue-doctor init + --pr-comment', () => {
  let stdout: string[];
  let stderr: string[];
  let dir: string;
  let originalExitCode: typeof process.exitCode;

  beforeEach(() => {
    stdout = [];
    stderr = [];
    dir = mkdtempSync(join(tmpdir(), 'vue-init-'));
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

  it('writes a doctor.config.ts with recommended defaults under --yes', async () => {
    const { run } = await import('../src/cli.js');
    const code = await run(['node', 'vue-doctor', 'init', '--yes', dir]);
    expect(code).toBe(0);
    const written = readFileSync(join(dir, 'doctor.config.ts'), 'utf-8');
    expect(written).toContain(
      "import { defineConfig } from '@geoql/doctor-core';",
    );
    expect(written).toContain("preset: 'recommended',");
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'));
    expect(pkg.scripts['doctor:check']).toBe('vue-doctor');
    expect(stdout.join('')).toContain('detected:');
  });

  it('writes doctor.config.json with --config-format json', async () => {
    const { run } = await import('../src/cli.js');
    const code = await run([
      'node',
      'vue-doctor',
      'init',
      '--yes',
      '--config-format',
      'json',
      dir,
    ]);
    expect(code).toBe(0);
    const parsed = JSON.parse(
      readFileSync(join(dir, 'doctor.config.json'), 'utf-8'),
    );
    expect(parsed).toEqual({ preset: 'recommended' });
  });

  it('adds a doctor key + script with --config-format package-json', async () => {
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'demo' }, null, 2),
    );
    const { run } = await import('../src/cli.js');
    const code = await run([
      'node',
      'vue-doctor',
      'init',
      '--yes',
      '--config-format',
      'package-json',
      dir,
    ]);
    expect(code).toBe(0);
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'));
    expect(pkg.doctor).toEqual({ preset: 'recommended' });
    expect(pkg.scripts['doctor:check']).toBe('vue-doctor');
  });

  it('prints the config under --dry-run and writes nothing', async () => {
    const { run } = await import('../src/cli.js');
    const code = await run([
      'node',
      'vue-doctor',
      'init',
      '--yes',
      '--dry-run',
      dir,
    ]);
    expect(code).toBe(0);
    expect(stdout.join('')).toContain("preset: 'recommended',");
    expect(() =>
      readFileSync(join(dir, 'doctor.config.ts'), 'utf-8'),
    ).toThrow();
  });

  it('exits non-zero when the config already exists without --force', async () => {
    writeFileSync(join(dir, 'doctor.config.ts'), 'export default {};\n');
    const { run } = await import('../src/cli.js');
    const code = await run(['node', 'vue-doctor', 'init', '--yes', dir]);
    expect(code).not.toBe(0);
    expect(stderr.join('')).toContain('already exists');
    expect(readFileSync(join(dir, 'doctor.config.ts'), 'utf-8')).toBe(
      'export default {};\n',
    );
  });

  it('overwrites an existing config with --force', async () => {
    writeFileSync(join(dir, 'doctor.config.ts'), 'export default {};\n');
    const { run } = await import('../src/cli.js');
    const code = await run([
      'node',
      'vue-doctor',
      'init',
      '--yes',
      '--force',
      dir,
    ]);
    expect(code).toBe(0);
    expect(readFileSync(join(dir, 'doctor.config.ts'), 'utf-8')).toContain(
      'defineConfig',
    );
  });

  it('exits 2 on an unknown --config-format', async () => {
    const { run } = await import('../src/cli.js');
    const code = await run([
      'node',
      'vue-doctor',
      'init',
      '--yes',
      '--config-format',
      'toml',
      dir,
    ]);
    expect(code).toBe(2);
    expect(stderr.join('')).toContain('--config-format');
  });

  it('exits 2 when prompts throws an Error', async () => {
    mockPromptAdapter.default.mockRejectedValueOnce(new Error('no TTY'));
    const { run } = await import('../src/cli.js');
    const code = await run(['node', 'vue-doctor', 'init', dir]);
    expect(code).toBe(2);
    expect(stderr.join('')).toContain('no TTY');
  });

  it('exits 2 when onCancel triggers (prompts cancelled by user)', async () => {
    mockPromptAdapter.default.mockImplementation(
      (_q: unknown, opts?: { onCancel?: () => boolean }) => {
        opts?.onCancel?.();
        return Promise.resolve({
          target: 'ts',
          preset: 'recommended',
          threshold: undefined,
          exclude: '',
        });
      },
    );
    const { run } = await import('../src/cli.js');
    const code = await run(['node', 'vue-doctor', 'init', dir]);
    expect(code).toBe(2);
  });

  it('completes interactive init with custom preset + threshold + excludes', async () => {
    mockPromptAdapter.default.mockResolvedValueOnce({
      target: 'ts',
      preset: 'strict',
      threshold: 80,
      exclude: 'node_modules/**,dist/**',
    });
    const { run } = await import('../src/cli.js');
    const code = await run(['node', 'vue-doctor', 'init', dir]);
    expect(code).toBe(0);
    const written = readFileSync(join(dir, 'doctor.config.ts'), 'utf-8');
    expect(written).toContain("preset: 'strict',");
    expect(written).toContain('threshold: 80,');
    expect(written).toContain('exclude:');
  });

  it('interactive path with package-json target initial and an exclude list', async () => {
    mockPromptAdapter.default.mockResolvedValueOnce({
      target: 'package-json',
      preset: 'minimal',
      threshold: 0,
      exclude: 'dist/**,docs/**',
    });
    const { run } = await import('../src/cli.js');
    const code = await run([
      'node',
      'vue-doctor',
      'init',
      '--config-format',
      'package-json',
      dir,
    ]);
    expect(code).toBe(0);
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'));
    expect(pkg.doctor).toEqual({
      preset: 'minimal',
      exclude: ['dist/**', 'docs/**'],
    });
  });

  it('stringifies a non-Error thrown and exits 2', async () => {
    mockPromptAdapter.default.mockRejectedValueOnce({
      toString: () => 'plain str failure',
    });
    const { run } = await import('../src/cli.js');
    const code = await run(['node', 'vue-doctor', 'init', dir]);
    expect(code).toBe(2);
    expect(stderr.join('')).toContain('plain str failure');
  });

  it('emits a Markdown PR comment body with --pr-comment', async () => {
    const { run } = await import('../src/cli.js');
    const code = await run([
      'node',
      'vue-doctor',
      '--no-dead-code',
      '--no-ci',
      '--pr-comment',
      violationDir,
    ]);
    expect(code).toBe(1);
    const out = stdout.join('');
    expect(out).toContain('## 🛡 @geoql/vue-doctor — Score:');
    expect(out).toContain('### Errors');
    expect(out).toContain('vue-doctor/template/v-for-has-key');
  }, 90000);
});
