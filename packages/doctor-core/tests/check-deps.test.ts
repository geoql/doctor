import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { checkDeps } from '../src/check-deps.js';
import { fixture, makeProjectInfo } from './deps/helpers.js';
import type { DepsIssue } from '../src/deps/types.js';

const mockCheckDuplicateVue = vi.hoisted(() => vi.fn());

vi.mock('../src/deps/check-duplicate-vue.js', () => ({
  checkDuplicateVue: mockCheckDuplicateVue,
}));

describe('checkDeps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('produces a Diagnostic with the correct shape when duplicate vue versions detected', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    const mockIssues: DepsIssue[] = [
      {
        ruleId: 'vue-doctor/deps/duplicate-vue-versions',
        file: require('node:path').join(dir, 'package.json'),
        line: 1,
        column: 1,
        severity: 'error',
        message:
          "Multiple versions of vue detected in node_modules: 3.5.0, 3.4.0. Vue's reactivity system requires a single instance.",
        recommendation: 'Add "vue": "^3.5.0" to pnpm.overrides to deduplicate.',
        versions: ['3.5.0', '3.4.0'],
      },
    ];
    mockCheckDuplicateVue.mockResolvedValue(mockIssues);

    const diagnostics = await checkDeps(makeProjectInfo(dir));

    expect(diagnostics).toHaveLength(1);
    const diag = diagnostics[0];
    expect(diag.source).toBe('deps');
    expect(diag.ruleId).toBe('vue-doctor/deps/duplicate-vue-versions');
    expect(diag.severity).toBe('error');
    expect(diag.file).toBe(require('node:path').join(dir, 'package.json'));
    expect(diag.line).toBe(1);
    expect(diag.column).toBe(1);
    expect(diag.message).toContain('Multiple versions of vue detected');
    expect(diag.recommendation).toBeTruthy();
  });

  it('returns [] when packageJsonPath is null', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    const projectInfo = makeProjectInfo(dir, { packageJsonPath: null });
    const diagnostics = await checkDeps(projectInfo);
    expect(diagnostics).toEqual([]);
    expect(mockCheckDuplicateVue).not.toHaveBeenCalled();
  });

  it('returns [] when no duplicate vue versions exist', async () => {
    const dir = await fixture({ 'package.json': '{"name":"x"}' });
    mockCheckDuplicateVue.mockResolvedValue([]);

    const diagnostics = await checkDeps(makeProjectInfo(dir));
    expect(diagnostics).toEqual([]);
  });
});
