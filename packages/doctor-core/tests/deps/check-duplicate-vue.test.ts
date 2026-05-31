import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { checkDuplicateVue } from '../../src/deps/check-duplicate-vue.js';
import { fixture, makeProjectInfo } from './helpers.js';

const { runPnpmList, runNpmList } = vi.hoisted(() => {
  return {
    runPnpmList: vi.fn(),
    runNpmList: vi.fn(),
  };
});

vi.mock('../../src/deps/exec-list.js', () => ({
  runPnpmList,
  runNpmList,
}));

describe('checkDuplicateVue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns [] when only one unique vue version is detected', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    runPnpmList.mockResolvedValue({
      versions: ['3.5.0'],
      error: null,
    });
    const issues = await checkDuplicateVue(makeProjectInfo(dir));
    expect(issues).toEqual([]);
  });

  it('returns one issue when multiple distinct vue versions are detected', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    runPnpmList.mockResolvedValue({
      versions: ['3.5.0', '3.4.0', '3.6.0'],
      error: null,
    });
    const issues = await checkDuplicateVue(makeProjectInfo(dir));
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe('vue-doctor/deps/duplicate-vue-versions');
    expect(issues[0].severity).toBe('error');
    expect(issues[0].message).toContain('3.5.0');
    expect(issues[0].message).toContain('3.4.0');
    expect(issues[0].message).toContain('3.6.0');
    expect(issues[0].recommendation).toContain('pnpm.overrides');
  });

  it('falls back to npm ls when pnpm returns non-zero exit code', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    runPnpmList.mockResolvedValue({
      versions: [],
      error: new Error('pnpm not found'),
    });
    runNpmList.mockResolvedValue({
      versions: ['3.5.0', '3.6.0'],
      error: null,
    });
    const issues = await checkDuplicateVue(makeProjectInfo(dir));
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('3.5.0');
    expect(issues[0].message).toContain('3.6.0');
  });

  it('returns [] gracefully when both pnpm and npm fail', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    runPnpmList.mockResolvedValue({
      versions: [],
      error: new Error('pnpm failed'),
    });
    runNpmList.mockResolvedValue({
      versions: [],
      error: new Error('npm failed'),
    });
    const issues = await checkDuplicateVue(makeProjectInfo(dir));
    expect(issues).toEqual([]);
  });

  it('returns [] when execFile times out', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    runPnpmList.mockResolvedValue({
      versions: [],
      error: new Error('timeout'),
    });
    runNpmList.mockResolvedValue({
      versions: [],
      error: new Error('timeout'),
    });
    const issues = await checkDuplicateVue(makeProjectInfo(dir));
    expect(issues).toEqual([]);
  });

  it('returns [] when packageJsonPath is null', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    const projectInfo = makeProjectInfo(dir, { packageJsonPath: null });
    expect(runPnpmList).not.toHaveBeenCalled();
    const issues = await checkDuplicateVue(projectInfo);
    expect(issues).toEqual([]);
  });

  it('collects all unique versions from the resolved tree', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    runPnpmList.mockResolvedValue({
      versions: ['3.0.0', '3.2.0', '3.1.0', '3.3.0'],
      error: null,
    });
    const issues = await checkDuplicateVue(makeProjectInfo(dir));
    expect(issues).toHaveLength(1);
    const uniqueVersions = ['3.0.0', '3.2.0', '3.1.0', '3.3.0'];
    for (const v of uniqueVersions) {
      expect(issues[0].message).toContain(v);
    }
  });
});
