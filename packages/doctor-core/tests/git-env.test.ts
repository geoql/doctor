import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { findGitRoot, gitEnv } from '../src/git-env.js';
import { listChangedFiles } from '../src/git-scope.js';

function git(cwd: string, args: string[]): void {
  execFileSync('git', args, { cwd, env: gitEnv(), stdio: 'ignore' });
}

describe('gitEnv', () => {
  it('drops GIT_DIR and GIT_WORK_TREE but keeps everything else', () => {
    const env = gitEnv({
      GIT_DIR: '/x/.git',
      GIT_WORK_TREE: '/x',
      GIT_INDEX_FILE: '/x/.git/index',
      PATH: '/bin',
    });
    expect(env).toEqual({ GIT_INDEX_FILE: '/x/.git/index', PATH: '/bin' });
  });

  it('defaults to process.env', () => {
    expect(gitEnv().PATH).toBe(process.env.PATH);
  });
});

describe('findGitRoot + linked worktrees', () => {
  let base: string;
  let repo: string;
  let worktree: string;

  beforeEach(() => {
    base = realpathSync(mkdtempSync(join(tmpdir(), 'doctor-git-env-')));
    repo = join(base, 'repo');
    worktree = join(base, 'wt');
    mkdirSync(join(repo, 'packages', 'app'), { recursive: true });
    git(repo, ['init', '-q', '-b', 'main']);
    git(repo, ['config', 'user.email', 't@example.com']);
    git(repo, ['config', 'user.name', 't']);
    git(repo, ['config', 'commit.gpgsign', 'false']);
    writeFileSync(join(repo, 'packages', 'app', 'a.ts'), 'export {};\n');
    git(repo, ['add', '.']);
    git(repo, ['commit', '-q', '-m', 'init', '--no-verify']);
    git(repo, ['worktree', 'add', '-q', worktree, '-b', 'wt']);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(base, { recursive: true, force: true });
  });

  it('returns the checkout top-level from a nested package', async () => {
    expect(await findGitRoot(join(repo, 'packages', 'app'))).toBe(repo);
  });

  it('returns the worktree root (not the main repo) inside a linked worktree', async () => {
    expect(await findGitRoot(join(worktree, 'packages', 'app'))).toBe(worktree);
  });

  it('ignores an inherited GIT_DIR pointing at another repo', async () => {
    vi.stubEnv('GIT_DIR', join(repo, '.git'));
    vi.stubEnv('GIT_WORK_TREE', repo);
    expect(await findGitRoot(worktree)).toBe(worktree);
  });

  it('returns null outside a git checkout', async () => {
    const lone = mkdtempSync(join(tmpdir(), 'doctor-no-git-'));
    try {
      expect(await findGitRoot(lone)).toBeNull();
    } finally {
      rmSync(lone, { recursive: true, force: true });
    }
  });

  it('lists staged files in a linked worktree even with GIT_DIR inherited', async () => {
    writeFileSync(join(worktree, 'packages', 'app', 'b.ts'), 'export {};\n');
    git(worktree, ['add', 'packages/app/b.ts']);
    vi.stubEnv('GIT_DIR', join(repo, '.git'));
    vi.stubEnv('GIT_WORK_TREE', repo);
    const files = await listChangedFiles({ rootDir: worktree, mode: 'staged' });
    expect(files).toEqual([join(worktree, 'packages', 'app', 'b.ts')]);
  });
});
