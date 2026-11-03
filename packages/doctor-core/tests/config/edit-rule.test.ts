import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import {
  defaultRuleLevel,
  isRuleLevel,
  setRuleLevel,
  upsertRuleInSource,
} from '../../src/config/edit-rule.js';
import { loadDoctorConfig } from '../../src/config/load.js';

const RULE = 'vue-doctor/security/no-v-html';

describe('upsertRuleInSource', () => {
  it('updates an existing rule entry (either quote style)', () => {
    const src = `export default defineConfig({\n  rules: {\n    "${RULE}": "error",\n  },\n});\n`;
    expect(upsertRuleInSource(src, RULE, 'off')).toContain(`'${RULE}': 'off'`);
  });

  it('inserts into an existing rules block', () => {
    const src = `export default defineConfig({\n  rules: {},\n});\n`;
    expect(upsertRuleInSource(src, RULE, 'warn')).toBe(
      `export default defineConfig({\n  rules: {\n    '${RULE}': 'warn',},\n});\n`,
    );
  });

  it('adds a rules block to defineConfig({ ... }) or export default { ... }', () => {
    expect(
      upsertRuleInSource(
        "export default defineConfig({\n  preset: 'recommended',\n});\n",
        RULE,
        'info',
      ),
    ).toBe(
      `export default defineConfig({\n  rules: {\n    '${RULE}': 'info',\n  },\n  preset: 'recommended',\n});\n`,
    );
    expect(upsertRuleInSource('export default {};\n', RULE, 'off')).toContain(
      `rules: {\n    '${RULE}': 'off',\n  },`,
    );
  });

  it('returns null for a shape it cannot edit', () => {
    expect(upsertRuleInSource('module.exports = config;\n', RULE, 'off')).toBe(
      null,
    );
  });
});

describe('isRuleLevel / defaultRuleLevel', () => {
  it('validates levels and looks up registry defaults', () => {
    expect(isRuleLevel('off')).toBe(true);
    expect(isRuleLevel('warning')).toBe(false);
    expect(defaultRuleLevel(RULE)).toBe('error');
    expect(defaultRuleLevel('nope/x')).toBeNull();
  });
});

describe('setRuleLevel', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'doctor-edit-rule-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates doctor.config.json when no config exists', async () => {
    const result = await setRuleLevel({ dir, ruleId: RULE, level: 'off' });
    expect(result.created).toBe(true);
    expect(result.path).toBe(join(dir, 'doctor.config.json'));
    expect(JSON.parse(readFileSync(result.path, 'utf8'))).toEqual({
      rules: { [RULE]: 'off' },
    });
    const resolved = await loadDoctorConfig(dir);
    expect(resolved.rules[RULE]).toBeUndefined();
  });

  it('edits doctor.config.ts in place (the init default) and stays loadable', async () => {
    const path = join(dir, 'doctor.config.ts');
    writeFileSync(
      path,
      "// keep me\nexport default {\n  preset: 'recommended',\n};\n",
    );
    const result = await setRuleLevel({ dir, ruleId: RULE, level: 'warn' });
    expect(result).toMatchObject({ path, created: false, level: 'warn' });
    const text = readFileSync(path, 'utf8');
    expect(text).toContain('// keep me');
    const resolved = await loadDoctorConfig(dir);
    expect(resolved.rules[RULE]).toBe('warn');
  });

  it('throws on a TS config it cannot edit safely', async () => {
    writeFileSync(
      join(dir, 'doctor.config.mjs'),
      'const c = {};\nexport { c as default };\n',
    );
    await expect(
      setRuleLevel({ dir, ruleId: RULE, level: 'off' }),
    ).rejects.toThrow(/cannot edit .*doctor\.config\.mjs automatically/);
  });

  it('edits doctor.config.jsonc as data (comments stripped)', async () => {
    const path = join(dir, 'doctor.config.jsonc');
    writeFileSync(
      path,
      '{\n  // comment\n  "preset": "strict",\n  "rules": { "vue-doctor/no-em-dash-in-string": "off" }\n}\n',
    );
    await setRuleLevel({ dir, ruleId: RULE, level: 'info' });
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({
      preset: 'strict',
      rules: { 'vue-doctor/no-em-dash-in-string': 'off', [RULE]: 'info' },
    });
  });

  it('edits package.json#doctor when that is the config', async () => {
    const path = join(dir, 'package.json');
    writeFileSync(
      path,
      JSON.stringify({ name: 'x', doctor: { preset: 'minimal' } }),
    );
    await setRuleLevel({ dir, ruleId: RULE, level: 'error' });
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({
      name: 'x',
      doctor: { preset: 'minimal', rules: { [RULE]: 'error' } },
    });
  });

  it('creates doctor.config.json when package.json has no doctor key', async () => {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x' }));
    const result = await setRuleLevel({ dir, ruleId: RULE, level: 'off' });
    expect(result.created).toBe(true);
    expect(JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))).toEqual(
      { name: 'x' },
    );
  });

  it('writes nothing in dry-run mode', async () => {
    const result = await setRuleLevel({
      dir,
      ruleId: RULE,
      level: 'off',
      dryRun: true,
    });
    expect(result.content).toContain(RULE);
    expect(existsSync(result.path)).toBe(false);
  });

  it('rejects unknown rules and levels', async () => {
    await expect(
      setRuleLevel({ dir, ruleId: 'nope/x', level: 'off' }),
    ).rejects.toThrow("unknown rule 'nope/x'");
    await expect(
      setRuleLevel({ dir, ruleId: RULE, level: 'warning' }),
    ).rejects.toThrow("invalid level 'warning'");
  });
});
