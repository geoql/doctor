import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const scriptPath = fileURLToPath(
  new URL('./bump-jsr-version.mjs', import.meta.url),
);

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

describe('bump-jsr-version', () => {
  let dir;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'jsr-bump-'));
    for (const pkg of [
      'doctor-core',
      'oxlint-plugin-vue-doctor',
      'vue-doctor',
    ]) {
      mkdirSync(join(dir, 'packages', pkg), { recursive: true });
    }
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('rewrites each jsr.json version to match its package.json', () => {
    const base = join(dir, 'packages', 'doctor-core');
    writeJson(join(base, 'package.json'), {
      name: '@geoql/doctor-core',
      version: '0.1.0-alpha.0',
    });
    writeJson(join(base, 'jsr.json'), {
      name: '@geoql/doctor-core',
      version: '0.0.0',
    });

    execFileSync('node', [scriptPath], { cwd: dir });

    const jsr = JSON.parse(readFileSync(join(base, 'jsr.json'), 'utf-8'));
    expect(jsr.version).toBe('0.1.0-alpha.0');
  });

  it('preserves other jsr.json fields and trailing newline', () => {
    const base = join(dir, 'packages', 'vue-doctor');
    writeJson(join(base, 'package.json'), {
      name: '@geoql/vue-doctor',
      version: '1.2.3',
    });
    writeJson(join(base, 'jsr.json'), {
      name: '@geoql/vue-doctor',
      version: '0.0.0',
      exports: './src/index.ts',
    });

    execFileSync('node', [scriptPath], { cwd: dir });

    const raw = readFileSync(join(base, 'jsr.json'), 'utf-8');
    expect(raw.endsWith('\n')).toBe(true);
    const jsr = JSON.parse(raw);
    expect(jsr.version).toBe('1.2.3');
    expect(jsr.exports).toBe('./src/index.ts');
  });

  it('skips packages that have no jsr.json', () => {
    const base = join(dir, 'packages', 'oxlint-plugin-vue-doctor');
    writeJson(join(base, 'package.json'), {
      name: '@geoql/oxlint-plugin-vue-doctor',
      version: '2.0.0',
    });

    expect(() =>
      execFileSync('node', [scriptPath], { cwd: dir }),
    ).not.toThrow();
  });
});
