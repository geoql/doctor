import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { checkDeadCode } from './check-dead-code.js';
import { dedupeDeadCodeAgainstLint } from './dead-code/dedupe.js';
import { applyInlineDisables } from './disables/index.js';
import { attachCodeSnippets } from './code-snippet.js';
import { detectProject } from './detect-project.js';
import { listSourceFiles } from './file-scan.js';
import { mergeDiagnostics } from './merge-diagnostics.js';
import { runScriptPass } from './oxlint/run.js';
import type { ProjectInfoLite } from './reporters/types.js';
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
  const threshold = config.threshold ?? 0;
  const lintEnabled = config.lint !== false;

  const files = await listSourceFiles({ rootDir, include, exclude });

  const start = performance.now();

  const templateDiagnostics = lintEnabled
    ? await runTemplatePass({ files, ruleOverrides: config.rules })
    : [];

  const sfcDiagnostics = lintEnabled
    ? await runSfcPass({ files, ruleOverrides: config.rules })
    : [];

  let scriptDiagnostics: Diagnostic[] = [];
  let oxlintStderr = '';
  if (lintEnabled) {
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
  }

  const project = await detectProject(rootDir);

  let deadCodeDiagnostics: Diagnostic[] = [];
  const deadCodeEnabled = config.deadCode !== false;
  if (deadCodeEnabled) {
    try {
      const { loadDoctorConfig } = await import('./config/load.js');
      const doctorConfig = await loadDoctorConfig(rootDir);
      const raw = await checkDeadCode({
        projectInfo: project,
        doctorConfig,
        enabled: true,
      });
      const deduplicated = dedupeDeadCodeAgainstLint(raw, [
        ...templateDiagnostics,
        ...sfcDiagnostics,
        ...scriptDiagnostics,
      ]);
      deadCodeDiagnostics = deduplicated.filter(
        (d) => config.rules?.[d.ruleId] !== 'off',
      );
    } catch {
      // knip failed — diagnostics remain empty for this pass
    }
  }

  const elapsedMs = performance.now() - start;

  const merged = mergeDiagnostics(
    templateDiagnostics,
    sfcDiagnostics,
    scriptDiagnostics,
    deadCodeDiagnostics,
  );
  let afterDisables = applyInlineDisables(merged, {
    respect: config.respectInlineDisables !== false,
  });
  if (config.scopeFiles) {
    const scope = new Set(config.scopeFiles.map((f) => resolve(rootDir, f)));
    afterDisables = afterDisables.filter((d) =>
      scope.has(resolve(rootDir, d.file)),
    );
  }
  const diagnostics = await attachCodeSnippets(afterDisables);
  const scored = scoreDiagnostics(diagnostics, { threshold });

  const projectInfo: ProjectInfoLite = {
    framework: project.framework,
    vueVersion: project.vueVersion,
    nuxtVersion: project.nuxtVersion,
    capabilities: [...project.capabilities].sort(),
    rootDirectory: project.rootDirectory,
  };

  let exitCode: 0 | 1 | 2 = 0;
  if (
    oxlintStderr &&
    scriptDiagnostics.length === 0 &&
    oxlintStderr.includes('Failed')
  ) {
    exitCode = 2;
  } else {
    const tripping =
      failOn === 'warn'
        ? scored.errorCount + scored.warnCount
        : scored.errorCount;
    if (tripping > 0) exitCode = 1;
  }

  return {
    rootDir,
    filesScanned: files.length,
    diagnostics,
    score: scored.score,
    errorCount: scored.errorCount,
    warnCount: scored.warnCount,
    infoCount: scored.infoCount,
    exitCode,
    scoreResult: scored,
    projectInfo,
    elapsedMs,
  };
}
