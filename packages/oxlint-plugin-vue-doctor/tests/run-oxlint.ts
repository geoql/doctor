import { execFileSync, execSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface OxlintDiagnostic {
  code?: string;
  msg?: string;
  severity?: string;
}

export interface OxlintResult {
  diagnostics: OxlintDiagnostic[];
}

const PLUGIN_DIST = resolve(import.meta.dirname, '../dist/index.js');

const OXLINT_BIN = (() => {
  const rootDir = resolve(import.meta.dirname, '../../..');
  // Resolve whichever oxlint version vite-plus currently bundles — every vite-plus
  // bump moves oxlint (e.g. 1.67 -> 1.70), so a hardcoded version silently breaks
  // these e2e tests. Anchor on `.pnpm/oxlint@` so eslint-plugin-oxlint and
  // oxlint-tsgolint dirs are excluded; take the highest version present.
  const found = execSync(
    `find ${rootDir}/node_modules/.pnpm -path '*/.pnpm/oxlint@*/node_modules/oxlint/bin/oxlint' | sort -V | tail -1`,
    { encoding: 'utf-8' },
  ).trim();
  if (!found) {
    throw new Error(
      'Real oxlint binary not found. E2E tests require the actual oxlint runtime.',
    );
  }
  return found;
})();

export function runOxlint(
  ruleId: string,
  fixture: string,
  fixtureExt = '.ts',
): OxlintResult {
  const tmpDir = resolve(import.meta.dirname, '.e2e-tmp');
  mkdirSync(tmpDir, { recursive: true });
  const configPath = resolve(tmpDir, '.oxlintrc.json');
  const fixturePath = resolve(tmpDir, `fixture${fixtureExt}`);
  let stdout = '';
  try {
    writeFileSync(
      configPath,
      JSON.stringify({
        jsPlugins: [PLUGIN_DIST],
        rules: { [`vue-doctor/${ruleId}`]: 'warn' },
      }),
    );
    writeFileSync(fixturePath, fixture);
    stdout = execFileSync(
      OXLINT_BIN,
      ['--format', 'json', '-c', configPath, fixturePath],
      { encoding: 'utf-8', timeout: 30_000 },
    );
  } catch (err: unknown) {
    const error = err as { stdout?: string; stderr?: string };
    if (error.stdout) {
      stdout = error.stdout;
    } else {
      throw new Error(
        `oxlint failed with no output: ${error.stderr ?? String(err)}`,
      );
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
  return JSON.parse(stdout) as OxlintResult;
}

export interface OxlintFixResult {
  before: string;
  after: string;
}

export function runOxlintFix(
  ruleId: string,
  fixture: string,
  fixtureExt = '.ts',
): OxlintFixResult {
  const tmpDir = resolve(import.meta.dirname, '.e2e-fix-tmp');
  mkdirSync(tmpDir, { recursive: true });
  const configPath = resolve(tmpDir, '.oxlintrc.json');
  const fixturePath = resolve(tmpDir, `fixture${fixtureExt}`);
  try {
    writeFileSync(
      configPath,
      JSON.stringify({
        jsPlugins: [PLUGIN_DIST],
        rules: { [`vue-doctor/${ruleId}`]: 'warn' },
      }),
    );
    writeFileSync(fixturePath, fixture);
    try {
      execFileSync(OXLINT_BIN, ['--fix', '-c', configPath, fixturePath], {
        encoding: 'utf-8',
        timeout: 30_000,
      });
    } catch {
      void 0;
    }
    return { before: fixture, after: readFileSync(fixturePath, 'utf-8') };
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

export function firedRuleIds(result: OxlintResult): string[] {
  return result.diagnostics
    .map((d) => d.code)
    .filter((code): code is string => code !== undefined);
}

export function hasStackOverflow(result: OxlintResult): boolean {
  return result.diagnostics.some(
    (d) =>
      (d.msg?.includes('call stack') ?? false) ||
      (d.msg?.includes('JS plugin') ?? false),
  );
}
