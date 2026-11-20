import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import {
  hookScriptEntries,
  moduleConventionEntries,
} from '../../src/dead-code/convention-entries.js';

async function project(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'geoql-doctor-conv-'));
  for (const [rel, content] of Object.entries(files)) {
    const parts = rel.split('/').slice(0, -1);
    if (parts.length > 0)
      await mkdir(join(root, parts.join('/')), { recursive: true });
    await writeFile(join(root, rel), content);
  }
  return root;
}

describe('moduleConventionEntries', () => {
  it('adds content.config when @nuxt/content is a dependency', () => {
    expect(moduleConventionEntries({ '@nuxt/content': '^3' })).toEqual([
      'content.config.{ts,js,mjs}',
    ]);
  });

  it('adds nothing without a module that loads a convention file', () => {
    expect(moduleConventionEntries({ nuxt: '^4' })).toEqual([]);
  });
});

describe('hookScriptEntries', () => {
  it('collects local scripts run from husky, lefthook, simple-git-hooks and lint-staged', async () => {
    const root = await project({
      '.husky/pre-push': '#!/usr/bin/env sh\nnode scripts/check-push.ts\n',
      '.husky/pre-commit':
        'pnpm exec lint-staged\ntsx ./scripts/pre.mts "$1"\n',
      '.husky/_/husky.sh': 'node scripts/internal.ts',
      'lefthook.yml':
        'pre-commit:\n  commands:\n    guard:\n      run: node scripts/guard.js {staged_files}\n',
      '.simple-git-hooks.json': '{ "commit-msg": "node scripts/msg.cjs" }',
      'lint-staged.config.js':
        "export default { '*.ts': ['node scripts/staged.ts'] };\n",
      'package.json': JSON.stringify({
        'simple-git-hooks': { 'pre-commit': 'node scripts/sgh.ts' },
        'lint-staged': { '*.md': 'node scripts/md.ts' },
        scripts: { build: 'node scripts/build.ts' },
      }),
      'scripts/check-push.ts': '',
      'scripts/pre.mts': '',
      'scripts/internal.ts': '',
      'scripts/guard.js': '',
      'scripts/msg.cjs': '',
      'scripts/staged.ts': '',
      'scripts/sgh.ts': '',
      'scripts/md.ts': '',
      'scripts/build.ts': '',
    });
    const entries = await hookScriptEntries(root);
    expect(entries.sort()).toEqual([
      'scripts/check-push.ts',
      'scripts/guard.js',
      'scripts/md.ts',
      'scripts/msg.cjs',
      'scripts/pre.mts',
      'scripts/sgh.ts',
      'scripts/staged.ts',
    ]);
  });

  it('ignores references to files that do not exist and paths outside the project', async () => {
    const root = await project({
      '.husky/pre-push': 'node scripts/missing.ts\nnode ../outside.ts\n',
      '.lintstagedrc': '{ "*.ts": "node /abs/x.ts" }',
    });
    expect(await hookScriptEntries(root)).toEqual([]);
  });

  it('returns [] when there are no hook configs or package.json is unreadable', async () => {
    expect(await hookScriptEntries(await project({}))).toEqual([]);
    expect(
      await hookScriptEntries(await project({ 'package.json': '{ nope' })),
    ).toEqual([]);
  });
});
