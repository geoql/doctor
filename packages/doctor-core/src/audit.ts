import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { checkBuildQuality } from './check-build-quality.js';
import { checkDeadCode } from './check-dead-code.js';
import { checkDeps } from './check-deps.js';
import { checkNuxtProject } from './check-nuxt-project.js';
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
import { runCrossFilePass } from './nuxt/cross-file/run.js';
import { runTemplatePass } from './template/run.js';
import type {
  AuditConfig,
  AuditReport,
  Diagnostic,
  AuditTimings,
  SkippedCheckReason,
} from './types.js';

const DEFAULT_INCLUDE = [
  '**/*.vue',
  '**/*.ts',
  '**/*.tsx',
  '**/*.js',
  '**/*.jsx',
];
const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.nuxt/**',
  '**/.output/**',
  '**/coverage/**',
];

function countRuleCounts(diagnostics: Diagnostic[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const d of diagnostics) {
    counts[d.ruleId] = (counts[d.ruleId] ?? 0) + 1;
  }
  return counts;
}

export async function audit(config: AuditConfig = {}): Promise<AuditReport> {
  const rootDir = resolve(config.rootDir ?? process.cwd());
  const include = config.include ?? DEFAULT_INCLUDE;
  const exclude = config.exclude ?? DEFAULT_EXCLUDE;
  const failOn = config.failOn ?? 'error';
  const threshold = config.threshold ?? 0;
  const lintEnabled = config.lint !== false;

  const files = await listSourceFiles({ rootDir, include, exclude });

  const overallStart = performance.now();
  const maxDurationMs = config.maxDurationMs;
  const deadlineMs = maxDurationMs ?? 0;
  const budgetExhausted = (): boolean =>
    maxDurationMs !== undefined &&
    performance.now() - overallStart >= maxDurationMs;
  const skippedPasses: string[] = [];
  const deadlineController = new AbortController();
  let deadlineTimer: NodeJS.Timeout | undefined;
  if (maxDurationMs !== undefined) {
    deadlineTimer = setTimeout(() => deadlineController.abort(), maxDurationMs);
  }

  const project = await detectProject(rootDir);

  const templateStart = performance.now();
  let templateDiagnostics: Diagnostic[] = [];
  if (lintEnabled) {
    if (budgetExhausted()) {
      skippedPasses.push('template');
    } else {
      templateDiagnostics = await runTemplatePass({
        files,
        ruleOverrides: config.rules,
      });
    }
  }
  const templateElapsed = performance.now() - templateStart;

  const sfcStart = performance.now();
  let sfcDiagnostics: Diagnostic[] = [];
  if (lintEnabled) {
    if (budgetExhausted()) {
      skippedPasses.push('sfc');
    } else {
      sfcDiagnostics = await runSfcPass({
        files,
        ruleOverrides: config.rules,
        projectInfo: project,
      });
    }
  }
  const sfcElapsed = performance.now() - sfcStart;

  let scriptDiagnostics: Diagnostic[] = [];
  let oxlintStderr = '';
  const scriptStart = performance.now();
  if (lintEnabled) {
    if (budgetExhausted()) {
      skippedPasses.push('lint');
    } else {
      try {
        const result = await runScriptPass({
          rootDir,
          targetPath: rootDir,
          ruleOverrides: config.rules,
          framework: project.framework === 'nuxt' ? 'nuxt' : 'vue',
          fix: config.fix === true && config.scopeFiles === undefined,
          fixExcludes: config.fixExcludes,
          exclude,
          signal: deadlineController.signal,
        });
        scriptDiagnostics = result.diagnostics;
        oxlintStderr = result.stderr;
      } catch (err) {
        if (deadlineController.signal.aborted) {
          // Aborted by the --max-duration deadline: record the skip instead of
          // disguising it as an oxlint failure (which would exit 2).
          skippedPasses.push('lint');
          oxlintStderr = 'aborted: time-budget exhausted';
        } else {
          oxlintStderr = err instanceof Error ? err.message : String(err);
          if (process.env.DOCTOR_DEBUG) {
            process.stderr.write(
              `[doctor-core] script pass failed: ${oxlintStderr}\n`,
            );
          }
        }
      }
    }
  }
  const scriptElapsed = performance.now() - scriptStart;

  let deadCodeDiagnostics: Diagnostic[] = [];
  let deadCodeElapsed = 0;
  const deadCodeEnabled = config.deadCode !== false && !budgetExhausted();
  if (config.deadCode !== false && !deadCodeEnabled) {
    skippedPasses.push('dead-code');
  }
  if (deadCodeEnabled) {
    const deadCodeStart = performance.now();
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
    } catch (err) {
      // knip failed — diagnostics remain empty for this pass. Surface it under
      // DOCTOR_DEBUG (matching the script pass) so a degraded dead-code run is
      // never silently disguised as a clean pass.
      if (process.env.DOCTOR_DEBUG) {
        process.stderr.write(
          `[doctor-core] dead-code pass failed: ${String(err)}\n`,
        );
      }
    }
    deadCodeElapsed = performance.now() - deadCodeStart;
  }

  let buildQualityDiagnostics: Diagnostic[] = [];
  let depsDiagnostics: Diagnostic[] = [];
  let nuxtProjectDiagnostics: Diagnostic[] = [];
  let crossFileDiagnostics: Diagnostic[] = [];
  if (budgetExhausted()) {
    skippedPasses.push('project');
  } else {
    try {
      const raw = await checkBuildQuality(project);
      buildQualityDiagnostics = raw
        .filter((d) => config.rules?.[d.ruleId] !== 'off')
        .map((d) => {
          const override = config.rules?.[d.ruleId];
          return override ? { ...d, severity: override } : d;
        });
    } catch {
      // build-quality pass failed — diagnostics remain empty for this pass
    }

    try {
      const raw = await checkDeps(project);
      depsDiagnostics = raw
        .filter((d) => config.rules?.[d.ruleId] !== 'off')
        .map((d) => {
          const override = config.rules?.[d.ruleId];
          return override ? { ...d, severity: override } : d;
        });
    } catch {
      // deps pass failed — diagnostics remain empty for this pass
    }

    if (project.framework === 'nuxt') {
      try {
        const raw = await checkNuxtProject(project);
        nuxtProjectDiagnostics = raw
          .filter((d) => config.rules?.[d.ruleId] !== 'off')
          .map((d) => {
            const override = config.rules?.[d.ruleId];
            return override ? { ...d, severity: override } : d;
          });
      } catch {
        // nuxt-project pass failed — diagnostics remain empty for this pass
      }

      try {
        const raw = await runCrossFilePass({ files, projectInfo: project });
        crossFileDiagnostics = raw
          .filter((d) => config.rules?.[d.ruleId] !== 'off')
          .map((d) => {
            const override = config.rules?.[d.ruleId];
            return override ? { ...d, severity: override } : d;
          });
      } catch {
        // cross-file pass failed — diagnostics remain empty for this pass
      }
    }
  }

  if (deadlineTimer) clearTimeout(deadlineTimer);

  const elapsedMs = performance.now() - overallStart;

  const timings: AuditTimings = {
    template: templateElapsed,
    sfc: sfcElapsed,
    script: scriptElapsed,
    deadCode: deadCodeElapsed,
    total: elapsedMs,
  };

  const merged = mergeDiagnostics(
    templateDiagnostics,
    sfcDiagnostics,
    scriptDiagnostics,
    deadCodeDiagnostics,
    buildQualityDiagnostics,
    depsDiagnostics,
    nuxtProjectDiagnostics,
    crossFileDiagnostics,
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

  const ruleCounts = countRuleCounts(diagnostics);

  const projectInfo: ProjectInfoLite = {
    framework: project.framework,
    frameworkDetected: project.frameworkDetected,
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
  } else if (failOn !== 'none') {
    const tripping =
      failOn === 'warn'
        ? scored.errorCount + scored.warnCount
        : scored.errorCount;
    if (tripping > 0) exitCode = 1;
  }

  const incomplete = skippedPasses.length > 0;
  const skippedCheckReasons: SkippedCheckReason[] | undefined = incomplete
    ? [
        {
          kind: 'time-budget-exhausted',
          deadlineMs,
          elapsedMs,
          skippedPasses,
        },
      ]
    : undefined;

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
    timings,
    ruleCounts,
    incomplete,
    ...(skippedCheckReasons ? { skippedCheckReasons } : {}),
  };
}
