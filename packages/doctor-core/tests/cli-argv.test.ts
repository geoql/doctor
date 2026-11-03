import { describe, expect, it } from 'vite-plus/test';
import { normalizeCliArgv } from '../src/cli-argv.js';

describe('normalizeCliArgv', () => {
  it('camel-cases kebab flags, keeping values and positionals', () => {
    expect(
      normalizeCliArgv([
        'node',
        'vue-doctor',
        'install',
        '--dry-run',
        './app',
        '--fail-on=warn',
        '--warning-exit-code',
        '9',
      ]),
    ).toEqual([
      'node',
      'vue-doctor',
      'install',
      '--dryRun',
      './app',
      '--failOn=warn',
      '--warningExitCode',
      '9',
    ]);
  });

  it('leaves negations, single-word flags, short flags and -- passthrough alone', () => {
    const argv = ['--no-dead-code', '--json', '-y', '--', '--dry-run'];
    expect(normalizeCliArgv(argv)).toEqual(argv);
  });
});
