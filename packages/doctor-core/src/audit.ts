import { resolve } from 'node:path';
import { listSourceFiles } from './file-scan.js';
import { mergeDiagnostics } from './merge-diagnostics.js';
import { runScriptPass } from './oxlint/run.js';
import { scoreDiagnostics } from './score.js';
import { runSfcPass } from './sfc/run.js';
import { runTemplatePass } from './template/run.js';
import type { AuditConfig, AuditReport, Diagnostic } from './types.js';

const DEFAULT_INCLUDE = [
  '**/*.vue',
  '**/*.ts',
  '**/*.tsx',
  '**/*.js',
  '**/*.jsx',
];
const DEFAULT_EXCLUDE = [
  'node_modules',
  'dist',
  '.nuxt',
  '.output',
  'coverage',
];

export async function audit(config: AuditConfig = {}): Promise<AuditReport> {
  const rootDir = resolve(config.rootDir ?? process.cwd());
  const include = config.include ?? DEFAULT_INCLUDE;
  const exclude = config.exclude ?? DEFAULT_EXCLUDE;
  const failOn = config.failOn ?? 'error';

  const files = await listSourceFiles({ rootDir, include, exclude });

  const templateDiagnostics = await runTemplatePass({
    files,
    ruleOverrides: config.rules,
  });

  const sfcDiagnostics = await runSfcPass({
    files,
    ruleOverrides: config.rules,
  });

  let scriptDiagnostics: Diagnostic[] = [];
  let oxlintStderr = '';
  try {
    const result = await runScriptPass({
      rootDir,
      targetPath: rootDir,
      ruleOverrides: config.rules,
    });
    scriptDiagnostics = result.diagnostics;
    oxlintStderr = result.stderr;
  } catch (err) {
    oxlintStderr = err instanceof Error ? err.message : String(err);
    if (process.env.DOCTOR_DEBUG) {
      process.stderr.write(
        `[doctor-core] script pass failed: ${oxlintStderr}\n`,
      );
    }
  }

  const merged = mergeDiagnostics(
    templateDiagnostics,
    sfcDiagnostics,
    scriptDiagnostics,
  );
  const { score, errorCount, warningCount } = scoreDiagnostics(merged);

  let exitCode: 0 | 1 | 2 = 0;
  if (
    oxlintStderr &&
    scriptDiagnostics.length === 0 &&
    oxlintStderr.includes('Failed')
  ) {
    exitCode = 2;
  } else {
    const tripping =
      failOn === 'warning' ? errorCount + warningCount : errorCount;
    if (tripping > 0) exitCode = 1;
  }

  return {
    rootDir,
    filesScanned: files.length,
    diagnostics: merged,
    score,
    errorCount,
    warningCount,
    exitCode,
  };
}
