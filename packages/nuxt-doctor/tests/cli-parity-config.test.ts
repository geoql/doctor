import {
  cpSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import { run } from '../src/cli.js';

const here = dirname(fileURLToPath(import.meta.url));
const violationDir = resolve(here, 'fixtures/violation');
const BIN = 'nuxt-doctor';
const KEY = 'vue-doctor/template/v-for-has-key';
const VHTML = 'vue-doctor/security/no-v-html';

describe(`${BIN} react.doctor parity — config, tags, rules`, () => {
  let stdout: string[];
  let stderr: string[];
  let originalExitCode: typeof process.exitCode;
  let tmp: string;

  beforeEach(() => {
    stdout = [];
    stderr = [];
    originalExitCode = process.exitCode;
    tmp = realpathSync(mkdtempSync(join(tmpdir(), `${BIN}-cfg-`)));
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
    rmSync(tmp, { recursive: true, force: true });
  });

  const out = () => stdout.join('');

  describe('tags', () => {
    it('list-rules --tag filters and the table shows tags', async () => {
      expect(await run(['node', BIN, 'list-rules', '--tag', 'design'])).toBe(0);
      expect(out()).toContain('vue-doctor/design/no-gradient-text');
      expect(out()).toContain('#design');
      expect(out()).not.toContain(VHTML);
    });

    it('list-rules --json carries tags', async () => {
      await run([
        'node',
        BIN,
        'list-rules',
        '--json',
        '--tag',
        'security-scan',
      ]);
      const payload = JSON.parse(out());
      expect(payload.rules[0].tags).toContain('security-scan');
    });

    it('rejects an unknown tag', async () => {
      expect(await run(['node', BIN, 'list-rules', '--tag', 'nope'])).toBe(2);
      expect(stderr.join('')).toContain("unknown --tag 'nope'");
    });

    it('explain prints tags', async () => {
      expect(await run(['node', BIN, 'explain', VHTML])).toBe(0);
      expect(out()).toContain('Tags:        vue, security-scan');
      stdout.length = 0;
      await run(['node', BIN, 'explain', VHTML, '--json']);
      expect(JSON.parse(out()).tags).toEqual(['vue', 'security-scan']);
    });

    it('explain prints framework-only and dead-code tags', async () => {
      await run(['node', BIN, 'explain', 'vue/require-typed-ref']);
      expect(out()).toContain('Tags:        vue');
      stdout.length = 0;
      await run(['node', BIN, 'explain', 'dead-code/unused-file']);
      expect(out()).toContain('Tags:        dead-code');
    });
  });

  describe('rules command', () => {
    it('lists rules with no action (alias behavior kept)', async () => {
      expect(await run(['node', BIN, 'rules'])).toBe(0);
      expect(out()).toContain(KEY);
      stdout.length = 0;
      expect(await run(['node', BIN, 'rules', 'list', '--tag', 'nope'])).toBe(
        2,
      );
      expect(stderr.join('')).toContain(`${BIN} rules: unknown --tag`);
    });

    it('rules explain <rule> delegates to explain', async () => {
      expect(await run(['node', BIN, 'rules', 'explain', VHTML])).toBe(0);
      expect(out()).toContain(`Rule:        ${VHTML}`);
      expect(await run(['node', BIN, 'rules', 'explain'])).toBe(2);
    });

    it('rules set writes the config and the audit honors it', async () => {
      cpSync(join(violationDir, 'App.vue'), join(tmp, 'App.vue'));
      expect(
        await run(['node', BIN, 'rules', 'set', KEY, 'warn', '--dir', tmp]),
      ).toBe(0);
      expect(out()).toContain(`${BIN} rules set: ${KEY} = warn (created`);
      expect(
        JSON.parse(readFileSync(join(tmp, 'doctor.config.json'), 'utf8')),
      ).toEqual({ rules: { [KEY]: 'warn' } });
      expect(await run(['node', BIN, tmp, '--no-dead-code', '--quiet'])).toBe(
        0,
      );
    });

    it('rules disable / enable toggle off and back to the default', async () => {
      await run(['node', BIN, 'rules', 'disable', KEY, '--dir', tmp]);
      expect(
        JSON.parse(readFileSync(join(tmp, 'doctor.config.json'), 'utf8')).rules,
      ).toEqual({ [KEY]: 'off' });
      expect(
        await run(['node', BIN, 'rules', 'enable', KEY, '--dir', tmp]),
      ).toBe(0);
      expect(out()).toContain('(updated');
      expect(
        JSON.parse(readFileSync(join(tmp, 'doctor.config.json'), 'utf8')).rules,
      ).toEqual({ [KEY]: 'error' });
    });

    it('rules set --dry-run prints and writes nothing', async () => {
      expect(
        await run([
          'node',
          BIN,
          'rules',
          'set',
          KEY,
          'off',
          '--dir',
          tmp,
          '--dry-run',
        ]),
      ).toBe(0);
      expect(out()).toContain('[dry-run] would write');
      expect(() => readFileSync(join(tmp, 'doctor.config.json'))).toThrow();
    });

    it('validates action, arity, rule id and level', async () => {
      expect(await run(['node', BIN, 'rules', 'frob', KEY])).toBe(2);
      expect(stderr.join('')).toContain("unknown action 'frob'");
      expect(await run(['node', BIN, 'rules', 'set', KEY])).toBe(2);
      expect(stderr.join('')).toContain(
        'usage: rules set <rule> <off|info|warn|error>',
      );
      expect(await run(['node', BIN, 'rules', 'enable'])).toBe(2);
      expect(stderr.join('')).toContain('usage: rules enable <rule>');
      expect(
        await run(['node', BIN, 'rules', 'enable', 'nope/x', '--dir', tmp]),
      ).toBe(2);
      expect(stderr.join('')).toContain("unknown rule 'nope/x'");
      expect(
        await run(['node', BIN, 'rules', 'set', KEY, 'loud', '--dir', tmp]),
      ).toBe(2);
      expect(stderr.join('')).toContain("invalid level 'loud'");
    });
  });

  describe('config ignore + surfaces', () => {
    beforeEach(() => {
      cpSync(join(violationDir, 'App.vue'), join(tmp, 'App.vue'));
    });

    function config(value: unknown): void {
      writeFileSync(join(tmp, 'doctor.config.json'), JSON.stringify(value));
    }

    it('ignore.rules drops the finding', async () => {
      config({ ignore: { rules: [KEY] } });
      expect(await run(['node', BIN, tmp, '--no-dead-code', '--json'])).toBe(0);
      expect(JSON.parse(out()).diagnostics).toEqual([]);
    });

    it('ignore.overrides drops the finding for matching files', async () => {
      config({ ignore: { overrides: [{ files: ['*.vue'], rules: [KEY] }] } });
      expect(await run(['node', BIN, tmp, '--no-dead-code', '--json'])).toBe(0);
    });

    it('ignore.files excludes the file from the scan', async () => {
      config({ ignore: { files: ['App.vue'] } });
      expect(await run(['node', BIN, tmp, '--no-dead-code', '--json'])).toBe(0);
      expect(JSON.parse(out()).diagnostics).toEqual([]);
    });

    it('surfaces.ciGate hides a finding from the gate but keeps it listed', async () => {
      config({ surfaces: { ciGate: { excludeRules: [KEY] } } });
      expect(await run(['node', BIN, tmp, '--no-dead-code', '--json'])).toBe(0);
      const report = JSON.parse(out());
      expect(report.diagnostics).toHaveLength(1);
      expect(report.score.value).toBeLessThan(100);
    });

    it('surfaces.score hides a finding from the score only', async () => {
      config({ surfaces: { score: { excludeRules: [KEY] } } });
      expect(await run(['node', BIN, tmp, '--no-dead-code', '--json'])).toBe(1);
      const report = JSON.parse(out());
      expect(report.score.value).toBe(100);
      expect(report.diagnostics).toHaveLength(1);
    });

    it('surfaces.prComment applies to --pr-comment only', async () => {
      config({ surfaces: { prComment: { excludeRules: [KEY] } } });
      await run(['node', BIN, tmp, '--no-dead-code', '--pr-comment']);
      expect(out()).not.toContain(KEY);
      stdout.length = 0;
      await run(['node', BIN, tmp, '--no-dead-code']);
      expect(out()).toContain(KEY);
    });

    it('rejects an unknown rule in ignore.rules', async () => {
      config({ ignore: { rules: ['nope/x'] } });
      expect(await run(['node', BIN, tmp, '--no-dead-code'])).toBe(2);
      expect(stderr.join('')).toContain('ignore.rules.0: unknown rule id');
    });
  });
});
