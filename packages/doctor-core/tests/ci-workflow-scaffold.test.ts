import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { detectCiProvider } from '../src/ci/provider-detect.js';
import { scaffoldCiWorkflow } from '../src/ci/scaffold-workflow.js';

async function tmpDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'geoql-doctor-ci-scaffold-'));
}

describe('detectCiProvider', () => {
  it('detects github when GITHUB_ACTIONS is true', () => {
    expect(detectCiProvider({ GITHUB_ACTIONS: 'true' })).toBe('github');
  });

  it('detects gitlab when GITLAB_CI is true', () => {
    expect(detectCiProvider({ GITLAB_CI: 'true' })).toBe('gitlab');
  });

  it('prefers github when both are set', () => {
    expect(
      detectCiProvider({ GITHUB_ACTIONS: 'true', GITLAB_CI: 'true' }),
    ).toBe('github');
  });

  it('returns unknown when neither is set', () => {
    expect(detectCiProvider({})).toBe('unknown');
  });
});

describe('scaffoldCiWorkflow — github', () => {
  it('builds a GitHub workflow YAML referencing geoql/doctor-action@v2', async () => {
    const dir = await tmpDir();
    const plan = await scaffoldCiWorkflow({
      bin: 'vue-doctor',
      framework: 'vue',
      dir,
      provider: 'github',
    });
    expect(plan.provider).toBe('github');
    expect(plan.conflict).toBe(false);
    expect(plan.writes).toHaveLength(1);
    const write = plan.writes[0]!;
    expect(write.path).toBe(join(dir, '.github', 'workflows', 'doctor.yml'));
    expect(write.content).toContain('uses: geoql/doctor-action@v2');
    expect(write.content).toContain('framework: vue');
    expect(write.content).toContain('preset: recommended');
    expect(write.content).toContain('threshold:');
    expect(write.content).toContain('fail-on: error');
    expect(write.content).toContain('api-key: ${{ secrets.DOCTOR_API_KEY }}');
    expect(write.content).toContain('project: ${{ github.repository }}');
  });

  it('builds a Nuxt workflow with framework=nuxt', async () => {
    const dir = await tmpDir();
    const plan = await scaffoldCiWorkflow({
      bin: 'nuxt-doctor',
      framework: 'nuxt',
      dir,
      provider: 'github',
    });
    expect(plan.writes[0]!.content).toContain('framework: nuxt');
    expect(plan.writes[0]!.content).toContain('uses: geoql/doctor-action@v2');
  });

  it('does not inline-npx — references geoql/doctor-action@v2 only', async () => {
    const dir = await tmpDir();
    const plan = await scaffoldCiWorkflow({
      bin: 'vue-doctor',
      framework: 'vue',
      dir,
      provider: 'github',
    });
    const content = plan.writes[0]!.content;
    expect(content.includes('npx vue-doctor')).toBe(false);
    expect(content.includes('npx @geoql/vue-doctor')).toBe(false);
  });

  it('enables pr-comment by default and disables it with noComments', async () => {
    const dir = await tmpDir();
    const withComments = await scaffoldCiWorkflow({
      bin: 'vue-doctor',
      framework: 'vue',
      dir,
      provider: 'github',
    });
    expect(withComments.writes[0]!.content).toContain("pr-comment: 'true'");
    const without = await scaffoldCiWorkflow({
      bin: 'vue-doctor',
      framework: 'vue',
      dir,
      provider: 'github',
      noComments: true,
    });
    expect(without.writes[0]!.content).toContain("pr-comment: 'false'");
  });

  it('writes the PR-review workflow when pr is set', async () => {
    const dir = await tmpDir();
    const plan = await scaffoldCiWorkflow({
      bin: 'vue-doctor',
      framework: 'vue',
      dir,
      provider: 'github',
      pr: true,
    });
    expect(plan.writes).toHaveLength(2);
    const prWrite = plan.writes[1]!;
    expect(prWrite.path).toBe(
      join(dir, '.github', 'workflows', 'doctor-pr.yml'),
    );
    expect(prWrite.content).toContain('uses: geoql/doctor-action@v2');
    expect(prWrite.content).toContain("pr-comment: 'true'");
    expect(prWrite.content).toContain('pull_request');
    expect(prWrite.content).toContain("diff: 'true'");
  });

  it('refuses to overwrite an existing doctor.yml without force', async () => {
    const dir = await tmpDir();
    const wfDir = join(dir, '.github', 'workflows');
    await mkdir(wfDir, { recursive: true });
    await writeFile(join(wfDir, 'doctor.yml'), 'CUSTOM\n');
    const plan = await scaffoldCiWorkflow({
      bin: 'vue-doctor',
      framework: 'vue',
      dir,
      provider: 'github',
    });
    expect(plan.conflict).toBe(true);
    expect(plan.conflictPath).toBe(join(wfDir, 'doctor.yml'));
  });

  it('overwrites with force', async () => {
    const dir = await tmpDir();
    const wfDir = join(dir, '.github', 'workflows');
    await mkdir(wfDir, { recursive: true });
    await writeFile(join(wfDir, 'doctor.yml'), 'CUSTOM\n');
    const plan = await scaffoldCiWorkflow({
      bin: 'vue-doctor',
      framework: 'vue',
      dir,
      provider: 'github',
      force: true,
    });
    expect(plan.conflict).toBe(false);
    expect(plan.writes).toHaveLength(1);
  });
});

describe('scaffoldCiWorkflow — gitlab', () => {
  it('emits a GitLab .gitlab-ci.yml gate when provider=gitlab', async () => {
    const dir = await tmpDir();
    const plan = await scaffoldCiWorkflow({
      bin: 'nuxt-doctor',
      framework: 'nuxt',
      dir,
      provider: 'gitlab',
    });
    expect(plan.provider).toBe('gitlab');
    expect(plan.writes).toHaveLength(1);
    const write = plan.writes[0]!;
    expect(write.path).toBe(join(dir, '.gitlab-ci.yml'));
    expect(write.content).toContain('npx -y @geoql/nuxt-doctor@latest');
    expect(write.content).not.toContain('geoql/doctor-action');
  });

  it('detects a gitlab conflict on an existing .gitlab-ci.yml', async () => {
    const dir = await tmpDir();
    await writeFile(join(dir, '.gitlab-ci.yml'), 'stages: [test]\n');
    const plan = await scaffoldCiWorkflow({
      bin: 'vue-doctor',
      framework: 'vue',
      dir,
      provider: 'gitlab',
    });
    expect(plan.conflict).toBe(true);
    expect(plan.conflictPath).toBe(join(dir, '.gitlab-ci.yml'));
  });
});

describe('scaffoldCiWorkflow — provider auto-detect', () => {
  it('falls back to github when auto-detect finds no CI env', async () => {
    const dir = await tmpDir();
    const plan = await scaffoldCiWorkflow({
      bin: 'vue-doctor',
      framework: 'vue',
      dir,
      provider: 'auto',
      env: {},
    });
    expect(plan.provider).toBe('github');
  });

  it('auto-detects gitlab from GITLAB_CI env', async () => {
    const dir = await tmpDir();
    const plan = await scaffoldCiWorkflow({
      bin: 'vue-doctor',
      framework: 'vue',
      dir,
      provider: 'auto',
      env: { GITLAB_CI: 'true' },
    });
    expect(plan.provider).toBe('gitlab');
  });

  it('defaults provider to auto when omitted', async () => {
    const dir = await tmpDir();
    const plan = await scaffoldCiWorkflow({
      bin: 'vue-doctor',
      framework: 'vue',
      dir,
      env: {},
    });
    expect(plan.provider).toBe('github');
  });

  it('falls back to process.env when no env snapshot is given', async () => {
    vi.stubEnv('GITHUB_ACTIONS', 'true');
    vi.stubEnv('GITLAB_CI', '');
    try {
      const dir = await tmpDir();
      const plan = await scaffoldCiWorkflow({
        bin: 'vue-doctor',
        framework: 'vue',
        dir,
      });
      expect(plan.provider).toBe('github');
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
