import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Environment for spawned `git` processes. Git sets `GIT_DIR` (and sometimes
 * `GIT_WORK_TREE`) when it runs a hook; inherited into a child `git` they pin
 * repository discovery to the hook's repo instead of `cwd`, which breaks
 * linked worktrees (`--staged` from a worktree's pre-commit hook). Clearing
 * both lets git rediscover the repository from `cwd`. `GIT_INDEX_FILE` is
 * deliberately kept: during a commit it points at the index being committed.
 */
export function gitEnv(
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const out: NodeJS.ProcessEnv = { ...env };
  delete out.GIT_DIR;
  delete out.GIT_WORK_TREE;
  return out;
}

/**
 * Top-level directory of the git checkout containing `dir` — for a linked
 * worktree that is the worktree root, not the main repository. `null` when
 * `dir` is not inside a git checkout (or git is unavailable).
 */
export async function findGitRoot(dir: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['rev-parse', '--show-toplevel'],
      { cwd: dir, env: gitEnv() },
    );
    return stdout.trim();
  } catch {
    return null;
  }
}
