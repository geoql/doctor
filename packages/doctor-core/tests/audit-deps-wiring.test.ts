import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { audit } from '../src/audit.js';

const state = vi.hoisted(() => ({ shouldReturnDeps: false }));

vi.mock('../src/deps/exec-list.js', () => ({
  runPnpmList: vi.fn().mockImplementation(async () => {
    if (state.shouldReturnDeps) {
      return { versions: ['3.5.0', '3.4.0'], error: null };
    }
    return { versions: [], error: new Error('no deps') };
  }),
  runNpmList: vi
    .fn()
    .mockResolvedValue({ versions: [], error: new Error('not used') }),
}));

describe('deps wiring in audit', () => {
  beforeEach(() => {
    state.shouldReturnDeps = false;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('remaps a deps diagnostic severity via a rule override', async () => {
    state.shouldReturnDeps = true;

    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-'));
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'test', dependencies: { vue: '^3.0.0' } }),
    );

    const report = await audit({
      rootDir: dir,
      deadCode: false,
      rules: {
        'vue-doctor/deps/duplicate-vue-versions': 'warn',
      },
    });

    const diag = report.diagnostics.find(
      (d) => d.ruleId === 'vue-doctor/deps/duplicate-vue-versions',
    );
    expect(diag).toBeDefined();
    expect(diag!.severity).toBe('warn');
    expect(diag!.source).toBe('deps');
  });

  it('filters out a deps diagnostic when rule is off', async () => {
    state.shouldReturnDeps = true;

    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-'));
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'test', dependencies: { vue: '^3.0.0' } }),
    );

    const report = await audit({
      rootDir: dir,
      deadCode: false,
      rules: {
        'vue-doctor/deps/duplicate-vue-versions': 'off',
      },
    });

    expect(
      report.diagnostics.some(
        (d) => d.ruleId === 'vue-doctor/deps/duplicate-vue-versions',
      ),
    ).toBe(false);
  });

  it('passes through deps diagnostic without remap when no override', async () => {
    state.shouldReturnDeps = true;

    const dir = await mkdtemp(join(tmpdir(), 'geoql-doctor-'));
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'test', dependencies: { vue: '^3.0.0' } }),
    );

    const report = await audit({
      rootDir: dir,
      deadCode: false,
      rules: {},
    });

    const diag = report.diagnostics.find(
      (d) => d.ruleId === 'vue-doctor/deps/duplicate-vue-versions',
    );
    expect(diag).toBeDefined();
    expect(diag!.severity).toBe('error');
  });
});
