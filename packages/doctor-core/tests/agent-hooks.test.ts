import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  AGENT_HOOK_TIMEOUT_SECONDS,
  claudeHookCommand,
  cursorHookCommand,
  planAgentHooks,
  writeAgentHooks,
} from '../src/install/agent-hooks.js';

describe('planAgentHooks / writeAgentHooks', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'doctor-agent-hooks-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const readJson = (rel: string) =>
    JSON.parse(readFileSync(join(root, rel), 'utf8'));

  it('writes Claude Code and Cursor stop hooks into an empty project', () => {
    const writes = planAgentHooks({ projectRoot: root, bin: 'vue-doctor' });
    expect(writes.map((w) => w.path)).toEqual([
      join(root, '.claude', 'settings.json'),
      join(root, '.claude', 'hooks', 'vue-doctor.mjs'),
      join(root, '.cursor', 'hooks.json'),
      join(root, '.cursor', 'hooks', 'vue-doctor.mjs'),
    ]);
    writeAgentHooks(writes);
    expect(readJson('.claude/settings.json')).toEqual({
      hooks: {
        Stop: [
          {
            hooks: [
              { type: 'command', command: claudeHookCommand('vue-doctor') },
            ],
          },
        ],
      },
    });
    expect(readJson('.cursor/hooks.json')).toEqual({
      version: 1,
      hooks: {
        stop: [
          {
            command: cursorHookCommand('vue-doctor'),
            timeout: AGENT_HOOK_TIMEOUT_SECONDS,
          },
        ],
      },
    });
  });

  it('merges with existing settings and is idempotent', () => {
    mkdirSync(join(root, '.claude'));
    mkdirSync(join(root, '.cursor'));
    writeFileSync(
      join(root, '.claude', 'settings.json'),
      JSON.stringify({
        permissions: { allow: ['Bash(ls)'] },
        hooks: {
          PostToolUse: [
            { matcher: 'Edit', hooks: [{ type: 'command', command: 'fmt' }] },
          ],
          Stop: [
            { hooks: [{ type: 'command', command: 'mine' }] },
            {
              hooks: [
                { type: 'command', command: 'theirs' },
                { type: 'command', command: claudeHookCommand('nuxt-doctor') },
              ],
            },
            {
              hooks: [
                { type: 'command', command: claudeHookCommand('nuxt-doctor') },
              ],
            },
            {},
          ],
        },
      }),
    );
    writeFileSync(
      join(root, '.cursor', 'hooks.json'),
      JSON.stringify({
        version: 2,
        hooks: {
          stop: [{ command: 'mine' }],
          afterFileEdit: [{ command: 'x' }],
        },
      }),
    );
    for (let i = 0; i < 2; i++) {
      writeAgentHooks(
        planAgentHooks({ projectRoot: root, bin: 'nuxt-doctor' }),
      );
    }
    const claude = readJson('.claude/settings.json');
    expect(claude.permissions).toEqual({ allow: ['Bash(ls)'] });
    expect(claude.hooks.PostToolUse).toHaveLength(1);
    expect(claude.hooks.Stop).toEqual([
      { hooks: [{ type: 'command', command: 'mine' }] },
      { hooks: [{ type: 'command', command: 'theirs' }] },
      {},
      {
        hooks: [{ type: 'command', command: claudeHookCommand('nuxt-doctor') }],
      },
    ]);
    const cursor = readJson('.cursor/hooks.json');
    expect(cursor.version).toBe(2);
    expect(cursor.hooks.afterFileEdit).toEqual([{ command: 'x' }]);
    expect(cursor.hooks.stop).toEqual([
      { command: 'mine' },
      { command: cursorHookCommand('nuxt-doctor'), timeout: 120 },
    ]);
  });

  it('treats an empty settings file as empty and rejects invalid JSON', () => {
    mkdirSync(join(root, '.claude'));
    writeFileSync(join(root, '.claude', 'settings.json'), '  \n');
    expect(() =>
      planAgentHooks({ projectRoot: root, bin: 'vue-doctor' }),
    ).not.toThrow();
    writeFileSync(join(root, '.claude', 'settings.json'), '{ nope');
    expect(() =>
      planAgentHooks({ projectRoot: root, bin: 'vue-doctor' }),
    ).toThrow(/could not parse .*settings\.json: invalid JSON/);
  });
});

describe('generated hook script', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'doctor-hook-run-'));
    writeAgentHooks(planAgentHooks({ projectRoot: root, bin: 'vue-doctor' }));
    mkdirSync(join(root, 'node_modules', '.bin'), { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function fakeDoctor(exitCode: number, output: string): void {
    const path = join(root, 'node_modules', '.bin', 'vue-doctor');
    writeFileSync(
      path,
      `#!/bin/sh\necho "args: $*"\necho "${output}"\nexit ${exitCode}\n`,
    );
    chmodSync(path, 0o755);
  }

  function runHook(agent: 'claude' | 'cursor', input: unknown) {
    const script =
      agent === 'claude'
        ? join(root, '.claude', 'hooks', 'vue-doctor.mjs')
        : join(root, '.cursor', 'hooks', 'vue-doctor.mjs');
    const env: NodeJS.ProcessEnv = { ...process.env };
    delete env.CLAUDE_PROJECT_DIR;
    if (agent === 'claude') env.CLAUDE_PROJECT_DIR = root;
    return spawnSync(process.execPath, [script], {
      input: JSON.stringify(input),
      encoding: 'utf8',
      env,
      cwd: tmpdir(),
    });
  }

  it.skipIf(process.platform === 'win32')(
    'blocks the Claude Code stop with the findings',
    () => {
      fakeDoctor(1, 'v-for-has-key App.vue:3');
      const result = runHook('claude', { stop_hook_active: false });
      expect(result.status).toBe(0);
      const payload = JSON.parse(result.stdout);
      expect(payload.decision).toBe('block');
      expect(payload.reason).toContain('v-for-has-key App.vue:3');
      expect(payload.reason).toContain(
        'args: --diff --fail-on warn --no-dead-code --format agent',
      );
    },
  );

  it.skipIf(process.platform === 'win32')(
    'stays silent on a clean run, a doctor error, or a re-entrant stop',
    () => {
      fakeDoctor(0, 'clean');
      expect(runHook('claude', {}).stdout).toBe('');
      fakeDoctor(1, 'dirty');
      expect(runHook('claude', { stop_hook_active: true }).stdout).toBe('');
      fakeDoctor(2, 'fatal: not a git repository');
      expect(runHook('claude', {}).stdout).toBe('');
    },
  );

  it.skipIf(process.platform === 'win32')(
    'sends a Cursor follow-up only for completed, first-loop stops',
    () => {
      fakeDoctor(1, 'dirty');
      const payload = JSON.parse(
        runHook('cursor', { status: 'completed', loop_count: 0 }).stdout,
      );
      expect(payload.followup_message).toContain('dirty');
      expect(runHook('cursor', { status: 'aborted' }).stdout).toBe('');
      expect(runHook('cursor', { loop_count: 1 }).stdout).toBe('');
    },
  );
});
