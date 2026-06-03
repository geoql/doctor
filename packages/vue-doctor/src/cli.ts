import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  audit,
  detectProject,
  detectSummary,
  encodeAnnotations,
  findMonorepoRoot,
  format,
  listChangedFiles,
  listRules,
  listWorkspacePackages,
  loadDoctorConfig,
  loadRuleDoc,
  mergeCliOverrides,
  normalizeInitAnswers,
  planInit,
  renderVerboseTrace,
  scoreDiagnostics,
  type AuditReport,
  type ConfigSource,
  type InitConfigFormat,
  type ListRulesFilter,
  type ProjectInfo,
  type RegisteredRule,
  type ReporterFormat,
  type ReporterInput,
  type ResolvedDoctorConfig,
  type RuleCategory,
  type RuleSource,
  type Severity,
  type WorkspacePackage,
} from '@geoql/doctor-core';
import { cac } from 'cac';
import prompts from 'prompts';

function readVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(
      readFileSync(resolve(here, '../package.json'), 'utf-8'),
    ) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

interface ListRulesCliFlags {
  preset?: string;
  category?: string;
  source?: string;
  severity?: string;
  json?: boolean;
  jsonCompact?: boolean;
}

interface ExplainCliFlags {
  json?: boolean;
}

interface InspectCliFlags {
  json?: boolean;
  jsonCompact?: boolean;
}

interface InitCliFlags {
  yes?: boolean;
  configFormat?: string;
  force?: boolean;
  dryRun?: boolean;
}

interface ProjectInfoJsonPayload {
  framework: string;
  rootDirectory: string;
  packageJsonPath: string | null;
  vueVersion: string | null;
  nuxtVersion: string | null;
  nuxtCompatibilityVersion: 3 | 4 | null;
  nitroPreset: string | null;
  typescriptVersion: string | null;
  monorepoKind: string | null;
  hasAutoImports: boolean;
  hasComponentsAutoImport: boolean;
  hasPinia: boolean;
  hasVueRouter: boolean;
  capabilities: string[];
}

function isCiEnvironment(): boolean {
  const env = process.env;
  return Boolean(
    env.CI === 'true' ||
    env.CI === '1' ||
    env.GITHUB_ACTIONS === 'true' ||
    env.GITLAB_CI === 'true' ||
    env.CIRCLECI === 'true' ||
    env.TRAVIS === 'true' ||
    env.BUILDKITE === 'true' ||
    env.JENKINS_HOME,
  );
}

function projectInfoToJson(p: ProjectInfo): ProjectInfoJsonPayload {
  return {
    framework: p.framework,
    rootDirectory: p.rootDirectory,
    packageJsonPath: p.packageJsonPath,
    vueVersion: p.vueVersion,
    nuxtVersion: p.nuxtVersion,
    nuxtCompatibilityVersion: p.nuxtCompatibilityVersion,
    nitroPreset: p.nitroPreset,
    typescriptVersion: p.typescriptVersion,
    monorepoKind: p.monorepoKind,
    hasAutoImports: p.hasAutoImports,
    hasComponentsAutoImport: p.hasComponentsAutoImport,
    hasPinia: p.hasPinia,
    hasVueRouter: p.hasVueRouter,
    capabilities: [...p.capabilities].sort(),
  };
}

function renderInspect(p: ProjectInfo, rootDir: string): string {
  const lines: string[] = [];
  lines.push(`@geoql/vue-doctor v${readVersion()} — project capabilities`);
  lines.push('');
  lines.push('framework');
  lines.push(`  ${p.framework}`);
  lines.push(`  vue: ${p.vueVersion ?? '(none)'}`);
  lines.push(`  typescript: ${p.typescriptVersion ?? '(none)'}`);
  lines.push('');
  lines.push('project layout');
  lines.push(`  rootDirectory: ${rootDir}`);
  lines.push(`  packageJsonPath: ${p.packageJsonPath ?? '(none)'}`);
  lines.push(`  monorepoKind: ${p.monorepoKind ?? '(none)'}`);
  lines.push('');
  lines.push('ecosystem');
  lines.push(`  hasAutoImports:          ${p.hasAutoImports}`);
  lines.push(`  hasComponentsAutoImport: ${p.hasComponentsAutoImport}`);
  lines.push(`  hasPinia:                ${p.hasPinia}`);
  lines.push(`  hasVueRouter:            ${p.hasVueRouter}`);
  lines.push('');
  lines.push('capability tokens (used by rule gating)');
  lines.push(`  ${[...p.capabilities].sort().join('\n  ')}`);
  lines.push('');
  lines.push("run 'vue-doctor inspect --json' for machine output");
  lines.push(
    "run 'vue-doctor list-rules' to see which rules these capabilities enable",
  );
  return `${lines.join('\n')}\n`;
}

interface ExplainableDoc {
  id: string;
  severity: string;
  category: string;
  source: string;
  recommended: boolean;
  helpUri: string;
  description: string;
  hasOverride: boolean;
}

function renderExplain(doc: ExplainableDoc): string {
  const lines: string[] = [];
  lines.push(`Rule:        ${doc.id}`);
  lines.push(`Severity:    ${doc.severity}`);
  lines.push(`Category:    ${doc.category}`);
  lines.push(`Source:      ${doc.source}`);
  lines.push(
    `Recommended: ${doc.recommended ? 'yes' : 'no (off in `recommended` preset)'}`,
  );
  lines.push(`Help:        ${doc.helpUri}`);
  lines.push('');
  lines.push(doc.description);
  return `${lines.join('\n')}\n`;
}

const VALID_LIST_PRESETS = new Set(['recommended', 'all']);
const VALID_CATEGORIES = new Set<RuleCategory>([
  'ai-slop',
  'reactivity',
  'composition',
  'performance',
  'template',
  'template-perf',
  'build-quality',
  'deps',
  'dead-code',
  'sfc',
  'vue-builtin',
]);
const VALID_SOURCES = new Set<RuleSource>([
  'doctor',
  'oxlint-builtin',
  'eslint-plugin-vue',
]);
const VALID_CONFIG_FORMATS = new Set(['ts', 'json', 'package-json']);

function buildListRulesFilter(flags: ListRulesCliFlags): ListRulesFilter {
  const out: {
    preset?: 'recommended' | 'all';
    category?: RuleCategory;
    source?: RuleSource;
    severity?: Severity;
  } = {};
  if (flags.preset !== undefined) {
    if (!VALID_LIST_PRESETS.has(flags.preset)) {
      throw new Error(
        `unknown --preset '${flags.preset}' (expected: recommended | all)`,
      );
    }
    out.preset = flags.preset as 'recommended' | 'all';
  }
  if (flags.category !== undefined) {
    if (!VALID_CATEGORIES.has(flags.category as RuleCategory)) {
      throw new Error(`unknown --category '${flags.category}'`);
    }
    out.category = flags.category as RuleCategory;
  }
  if (flags.source !== undefined) {
    if (!VALID_SOURCES.has(flags.source as RuleSource)) {
      throw new Error(`unknown --source '${flags.source}'`);
    }
    out.source = flags.source as RuleSource;
  }
  if (flags.severity !== undefined) {
    if (
      flags.severity !== 'error' &&
      flags.severity !== 'warn' &&
      flags.severity !== 'info'
    ) {
      throw new Error(
        `unknown --severity '${flags.severity}' (expected: error | warn | info)`,
      );
    }
    out.severity = flags.severity;
  }
  return out;
}

function renderRulesTable(rules: RegisteredRule[]): string {
  if (rules.length === 0) return 'No rules matched.\n';
  const lines: string[] = [
    `@geoql/vue-doctor — ${rules.length} rule${rules.length === 1 ? '' : 's'}`,
    '',
  ];
  const idWidth = Math.max(...rules.map((r) => r.id.length));
  const sevWidth = Math.max(...rules.map((r) => r.severity.length));
  const catWidth = Math.max(...rules.map((r) => r.category.length));
  for (const r of rules) {
    const tag = r.recommended ? '[recommended]' : '              ';
    lines.push(
      `  ${r.id.padEnd(idWidth)}  ${r.severity.padEnd(sevWidth)}  ${r.category.padEnd(catWidth)}  ${r.source}  ${tag}`,
    );
  }
  return `${lines.join('\n')}\n`;
}

interface CliFlags {
  format?: string;
  config?: string;
  preset?: string;
  failOn?: string;
  json?: boolean;
  jsonCompact?: boolean;
  color?: boolean;
  quiet?: boolean;
  verbose?: boolean;
  output?: string;
  rule?: string | string[];
  include?: string | string[];
  exclude?: string | string[];
  deadCode?: boolean;
  lint?: boolean;
  respectInlineDisables?: boolean;
  threshold?: string;
  score?: boolean;
  annotations?: boolean;
  ci?: boolean;
  diff?: boolean;
  staged?: boolean;
  full?: boolean;
  project?: string;
  prComment?: string | true;
}

interface PreparedOptions {
  ruleOverrides: Record<string, Severity | 'off'> | undefined;
  threshold: number | undefined;
}

function toArray(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}

function parseRuleOverrides(
  rules: string[] | undefined,
): Record<string, Severity | 'off'> | undefined {
  if (!rules || rules.length === 0) return undefined;
  const out: Record<string, Severity | 'off'> = {};
  for (const entry of rules) {
    const idx = entry.lastIndexOf(':');
    if (idx === -1) {
      throw new Error(
        `Invalid --rule "${entry}". Expected format <ruleId>:<error|warn|info|off>.`,
      );
    }
    const ruleId = entry.slice(0, idx);
    const level = entry.slice(idx + 1);
    if (
      level !== 'error' &&
      level !== 'warn' &&
      level !== 'info' &&
      level !== 'off'
    ) {
      throw new Error(
        `Invalid severity "${level}" for --rule "${entry}". Expected error|warn|info|off.`,
      );
    }
    if (ruleId.length === 0) {
      throw new Error(`Invalid --rule "${entry}". Rule id must not be empty.`);
    }
    out[ruleId] = level;
  }
  return out;
}

function resolveFormat(flags: CliFlags): ReporterFormat {
  if (flags.prComment !== undefined) return 'pr-comment';
  if (flags.jsonCompact) return 'json-compact';
  if (flags.json) return 'json';
  const kind = flags.format;
  const userPickedFormat =
    kind === 'pretty' ||
    kind === 'json' ||
    kind === 'json-compact' ||
    kind === 'sarif' ||
    kind === 'html' ||
    kind === 'pr-comment';
  if (userPickedFormat) {
    return kind as ReporterFormat;
  }
  if (
    typeof flags.output === 'string' &&
    flags.output.toLowerCase().endsWith('.html')
  ) {
    return 'html';
  }
  return 'agent';
}

function isFailOnLevel(v: string): v is 'error' | 'warn' | 'none' {
  return v === 'error' || v === 'warn' || v === 'none';
}

async function runSingleAudit(
  rootDir: string,
  flags: CliFlags,
  prepared: PreparedOptions,
): Promise<{ report: AuditReport; source: ConfigSource }> {
  let scopeFiles: string[] | undefined;
  if (!flags.full && (flags.diff || flags.staged)) {
    scopeFiles = await listChangedFiles({
      rootDir,
      mode: flags.staged ? 'staged' : 'diff',
    });
  }
  const resolved = await loadDoctorConfig(rootDir, {
    ...(flags.config ? { explicitPath: flags.config } : {}),
    ...(flags.preset ? { presetOverride: flags.preset } : {}),
  });
  const merged: ResolvedDoctorConfig = mergeCliOverrides(resolved, {
    failOn: flags.failOn as 'error' | 'warn' | 'none' | undefined,
    include: toArray(flags.include),
    exclude: toArray(flags.exclude),
    rules: prepared.ruleOverrides,
    threshold: prepared.threshold,
  });
  const report = await audit({
    rootDir: merged.rootDir,
    include: merged.include,
    exclude: merged.exclude,
    rules: merged.rules,
    failOn: merged.failOn,
    threshold: merged.threshold,
    deadCode: flags.deadCode,
    lint: flags.lint,
    respectInlineDisables: flags.respectInlineDisables,
    scopeFiles,
  });
  const allowedRuleIds = new Set(Object.keys(merged.rules));
  report.diagnostics = report.diagnostics.filter((d) =>
    allowedRuleIds.has(d.ruleId),
  );
  return { report, source: resolved.source };
}

function aggregateReports(
  reports: AuditReport[],
  rootDirectory: string,
): AuditReport {
  const first = reports[0];
  const diagnostics = reports.flatMap((r) => r.diagnostics);
  let filesScanned = 0;
  let elapsedMs = 0;
  let exitCode: 0 | 1 | 2 = 0;
  for (const r of reports) {
    filesScanned += r.filesScanned;
    elapsedMs += r.elapsedMs;
    if (r.exitCode > exitCode) exitCode = r.exitCode;
  }
  const ruleCounts: Record<string, number> = {};
  for (const d of diagnostics) {
    ruleCounts[d.ruleId] = (ruleCounts[d.ruleId] ?? 0) + 1;
  }
  const scoreResult = scoreDiagnostics(diagnostics, {
    threshold: first.scoreResult.threshold,
  });
  return {
    rootDir: rootDirectory,
    filesScanned,
    diagnostics,
    score: scoreResult.score,
    errorCount: scoreResult.errorCount,
    warnCount: scoreResult.warnCount,
    infoCount: scoreResult.infoCount,
    exitCode,
    scoreResult,
    projectInfo: { ...first.projectInfo, rootDirectory },
    elapsedMs,
    timings: first.timings,
    ruleCounts,
  };
}

function emitReport(
  report: AuditReport,
  reporter: ReporterFormat,
  flags: CliFlags,
): void {
  const input: ReporterInput = {
    toolName: '@geoql/vue-doctor',
    toolVersion: readVersion(),
    rootDirectory: report.rootDir,
    analyzedFileCount: report.filesScanned,
    elapsedMs: report.elapsedMs,
    diagnostics: report.diagnostics,
    score: report.scoreResult,
    projectInfo: report.projectInfo,
  };
  const out = format(input, reporter, {
    color: flags.color,
    quiet: flags.quiet,
  });
  if (flags.output) {
    writeFileSync(resolve(flags.output), out);
  } else {
    process.stdout.write(out);
  }
  const ciExplicitOptOut = flags.ci === false;
  const ciExplicitOptIn = flags.ci === true;
  const ciAutoDetected = !ciExplicitOptOut && isCiEnvironment();
  const wantsAnnotations =
    flags.annotations === true || ciExplicitOptIn || ciAutoDetected;
  const reporterCarriesAnnotations =
    reporter === 'agent' || reporter === 'pretty';
  if (
    wantsAnnotations &&
    reporterCarriesAnnotations &&
    !flags.quiet &&
    report.diagnostics.length > 0
  ) {
    process.stdout.write(`${encodeAnnotations(report.diagnostics)}\n`);
  }
}

async function runProjectAudits(
  rootDir: string,
  flags: CliFlags,
  prepared: PreparedOptions,
  packages: WorkspacePackage[],
): Promise<{ report: AuditReport; source: ConfigSource } | null> {
  const requested = flags
    .project!.split(',')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  const byName = new Map(packages.map((p) => [p.name, p]));
  const reports: AuditReport[] = [];
  let source: ConfigSource = 'built-in';
  for (const name of requested) {
    const match = byName.get(name);
    if (!match) {
      process.stderr.write(
        `vue-doctor: --project: unknown project "${name}" (skipped)\n`,
      );
      continue;
    }
    const single = await runSingleAudit(match.dir, flags, prepared);
    reports.push(single.report);
    source = single.source;
  }
  if (reports.length === 0) {
    process.stderr.write(
      'vue-doctor: --project: no matching workspace projects\n',
    );
    return null;
  }
  const { root } = await findMonorepoRoot(rootDir);
  return { report: aggregateReports(reports, root), source };
}

async function runInit(dir: string, flags: InitCliFlags): Promise<void> {
  const targetDir = resolve(dir);
  const configFormat = (flags.configFormat ?? 'ts') as InitConfigFormat;
  if (!VALID_CONFIG_FORMATS.has(configFormat)) {
    process.stderr.write(
      `vue-doctor init: --config-format must be ts | json | package-json, got '${flags.configFormat}'\n`,
    );
    process.exitCode = 2;
    return;
  }

  const resolvedAnswers = flags.yes
    ? {
        configFormat,
        preset: 'recommended' as const,
        threshold: undefined,
        exclude: undefined,
      }
    : await runInteractiveInit(configFormat);

  if (process.exitCode === 2) return;

  const plan = await planInit({
    dir: targetDir,
    configFormat: resolvedAnswers.configFormat,
    preset: resolvedAnswers.preset,
    threshold: resolvedAnswers.threshold,
    exclude: resolvedAnswers.exclude,
    binName: 'vue-doctor',
  });

  const summary = await detectSummary(targetDir);
  process.stdout.write(`${summary}\n`);

  if (plan.conflict && !flags.force) {
    process.stderr.write(
      `vue-doctor init: ${plan.conflictPath} already exists. Run with --force to overwrite.\n`,
    );
    process.exitCode = 2;
    return;
  }

  if (flags.dryRun) {
    for (const write of plan.writes) {
      process.stdout.write(`[dry-run] would write ${write.path}\n`);
      process.stdout.write(`${write.content}\n`);
    }
    process.exitCode = 0;
    return;
  }

  for (const write of plan.writes) {
    writeFileSync(write.path, write.content, 'utf8');
  }
  process.exitCode = 0;
}

async function runInteractiveInit(defaultFormat: InitConfigFormat): Promise<{
  configFormat: InitConfigFormat;
  preset: 'recommended' | 'strict' | 'minimal';
  threshold: number | undefined;
  exclude: string | undefined;
}> {
  const answers = await prompts(
    [
      {
        type: 'select',
        name: 'target',
        message: 'Config target?',
        choices: [
          { title: 'doctor.config.ts (recommended)', value: 'ts' },
          { title: 'doctor.config.json', value: 'json' },
          { title: 'package.json#doctor', value: 'package-json' },
        ],
        initial: defaultFormat === 'package-json' ? 2 : 0,
      },
      {
        type: 'select',
        name: 'preset',
        message: 'Base preset?',
        choices: [
          { title: 'recommended (errors + warnings)', value: 'recommended' },
          { title: 'strict (recommended + info)', value: 'strict' },
          { title: 'minimal (errors only)', value: 'minimal' },
        ],
        initial: 0,
      },
      {
        type: 'number',
        name: 'threshold',
        message: 'Minimum passing score (0-100, blank to skip)',
        min: 0,
        max: 100,
        initial: '',
      },
      {
        type: 'text',
        name: 'exclude',
        message: 'Exclude glob patterns (comma-separated, blank to skip)',
        initial: '',
      },
    ],
    {
      onCancel: () => {
        process.stderr.write('vue-doctor init: cancelled\n');
        process.exitCode = 2;
      },
    },
  );

  if (process.exitCode === 2)
    return {
      configFormat: 'ts' as InitConfigFormat,
      preset: 'recommended' as const,
      threshold: undefined,
      exclude: undefined,
    };

  return normalizeInitAnswers({
    target: answers.target as InitConfigFormat | undefined,
    preset: answers.preset as 'recommended' | 'strict' | 'minimal' | undefined,
    threshold: answers.threshold || undefined,
    exclude: answers.exclude as string | undefined,
  });
}

export async function run(argv: string[] = process.argv): Promise<number> {
  const cli = cac('vue-doctor');

  cli
    .command('[path]', 'Audit a Vue project')
    .option(
      '--format <kind>',
      'Output format (agent|pretty|json|json-compact|sarif|html|pr-comment)',
      {
        default: 'agent',
      },
    )
    .option('--json', 'Shorthand for --format json')
    .option('--json-compact', 'Emit single-line JSON')
    .option('--config <path>', 'Path to doctor.config.ts')
    .option('--preset <name>', 'Base preset: minimal|recommended|strict|all')
    .option(
      '--fail-on <level>',
      'Exit non-zero on this severity or a worse (error|warn|none)',
      {
        default: 'error',
      },
    )
    .option('--quiet', 'Only show the summary')
    .option('--verbose', 'Emit per-pass timing and rule diagnostics on stderr')
    .option('--no-color', 'Disable colored output')
    .option(
      '--rule <id:level>',
      'Override a rule (repeatable), e.g. --rule a/b:off',
    )
    .option('--include <glob>', 'Glob of files to include (repeatable)')
    .option('--exclude <glob>', 'Glob of files to exclude (repeatable)')
    .option('--no-dead-code', 'Skip the dead-code (knip) analysis pass')
    .option('--no-lint', 'Skip the lint passes (template/SFC/oxlint)')
    .option(
      '--no-respect-inline-disables',
      'Surface findings even inside doctor-disable comments',
    )
    .option('--threshold <n>', 'Minimum passing score (0-100)')
    .option('--score', 'Output only the numeric score (for piping)')
    .option('--annotations', 'Emit GitHub Actions ::error::/::warning:: lines')
    .option('--ci', 'Auto-enable CI behavior (--annotations on GitHub Actions)')
    .option('--no-ci', 'Disable CI auto-detection even when CI env is set')
    .option('--diff', 'Only report findings in files changed vs HEAD')
    .option('--staged', 'Only report findings in staged files')
    .option('--full', 'Force a complete scan (overrides --diff/--staged)')
    .option(
      '--project <name>',
      'Comma-separated workspace project names to audit (monorepo)',
    )
    .option('--output <file>', 'Write the report to a file instead of stdout')
    .option('--pr-comment', 'Emit a focused Markdown PR-comment body')
    .action(async (path: string | undefined, flags: CliFlags) => {
      const reporter = resolveFormat(flags);
      if (flags.failOn !== undefined && !isFailOnLevel(flags.failOn)) {
        process.stderr.write(
          `vue-doctor: --fail-on must be 'error', 'warn', or 'none', got '${flags.failOn}'\n`,
        );
        process.exitCode = 2;
        return;
      }
      const rootDir = resolve(path ?? '.');

      try {
        if (flags.score && (flags.json || flags.jsonCompact)) {
          throw new Error(
            '--score and --json are mutually exclusive (--score outputs a plaintext integer).',
          );
        }
        const ruleOverrides = parseRuleOverrides(toArray(flags.rule));
        const threshold =
          flags.threshold === undefined ? undefined : Number(flags.threshold);
        if (
          threshold !== undefined &&
          (!Number.isInteger(threshold) || threshold < 0 || threshold > 100)
        ) {
          throw new Error(
            `--threshold must be an integer 0-100, got "${flags.threshold}".`,
          );
        }
        if (flags.diff && flags.staged) {
          throw new Error('--diff and --staged are mutually exclusive.');
        }
        if (flags.verbose && flags.quiet) {
          throw new Error('--verbose and --quiet are mutually exclusive.');
        }
        const prepared: PreparedOptions = { ruleOverrides, threshold };

        const workspacePackages = flags.project
          ? await listWorkspacePackages(rootDir)
          : [];
        if (flags.project && workspacePackages.length === 0) {
          process.stderr.write(
            'vue-doctor: --project ignored: not a pnpm workspace\n',
          );
        }

        let report: AuditReport;
        let configSource: ConfigSource;
        if (flags.project && workspacePackages.length > 0) {
          const aggregated = await runProjectAudits(
            rootDir,
            flags,
            prepared,
            workspacePackages,
          );
          if (!aggregated) {
            process.exitCode = 2;
            return;
          }
          report = aggregated.report;
          configSource = aggregated.source;
        } else {
          const single = await runSingleAudit(rootDir, flags, prepared);
          report = single.report;
          configSource = single.source;
        }

        if (flags.verbose) {
          const verboseOutput = renderVerboseTrace(report, {
            configSource,
          });
          process.stderr.write(`${verboseOutput}\n`);
        }
        if (flags.score) {
          process.stdout.write(`${report.score}\n`);
          process.exitCode = report.exitCode;
          return;
        }
        emitReport(report, reporter, flags);
        process.exitCode = report.exitCode;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(`vue-doctor: ${msg}\n`);
        process.exitCode = 2;
      }
    });

  cli
    .command(
      'list-rules',
      'List every registered rule with id, severity, category, source, and preset membership',
    )
    .option('--preset <name>', 'Filter to: recommended | all')
    .option('--category <name>', 'Filter by category')
    .option(
      '--source <name>',
      'Filter by source: doctor | oxlint-builtin | eslint-plugin-vue',
    )
    .option('--severity <level>', 'Filter by: error | warn | info')
    .option('--json', 'Emit JSON instead of formatted text')
    .option('--json-compact', 'With --json, single-line output')
    .action(async (flags: ListRulesCliFlags) => {
      try {
        const filter = buildListRulesFilter(flags);
        const rules = listRules(filter);
        if (flags.json || flags.jsonCompact) {
          const payload = { count: rules.length, rules };
          process.stdout.write(
            flags.jsonCompact
              ? JSON.stringify(payload)
              : `${JSON.stringify(payload, null, 2)}\n`,
          );
        } else {
          process.stdout.write(renderRulesTable(rules));
        }
        process.exitCode = 0;
      } catch (err) {
        const msg = (err as Error).message;
        process.stderr.write(`vue-doctor list-rules: ${msg}\n`);
        process.exitCode = 2;
      }
    });

  cli
    .command(
      'explain <ruleId>',
      "Print the rule's severity, category, recommendation, and helpUri",
    )
    .option('--json', 'Emit structured JSON instead of formatted text')
    .action(async (ruleId: string, flags: ExplainCliFlags) => {
      const doc = loadRuleDoc(ruleId);
      if (!doc) {
        process.stderr.write(
          `vue-doctor explain: unknown rule '${ruleId}'. Try \`vue-doctor list-rules\` to see registered rules.\n`,
        );
        process.exitCode = 2;
        return;
      }
      if (flags.json) {
        process.stdout.write(`${JSON.stringify(doc, null, 2)}\n`);
      } else {
        process.stdout.write(renderExplain(doc));
      }
      process.exitCode = 0;
    });

  cli
    .command(
      'inspect [dir]',
      'Print the detected project capabilities doctor uses to gate rules',
    )
    .option('--json', 'Emit structured JSON instead of formatted text')
    .option('--json-compact', 'With --json, emit a single-line payload')
    .action(async (dir: string | undefined, flags: InspectCliFlags) => {
      const rootDir = resolve(dir ?? '.');
      const project = await detectProject(rootDir);
      if (flags.json || flags.jsonCompact) {
        const payload = projectInfoToJson(project);
        const out = flags.jsonCompact
          ? JSON.stringify(payload)
          : JSON.stringify(payload, null, 2);
        process.stdout.write(`${out}\n`);
      } else {
        process.stdout.write(renderInspect(project, rootDir));
      }
      process.exitCode = 0;
    });

  cli
    .command('init [dir]', 'Scaffold a doctor config for the project')
    .option('-y, --yes', 'Non-interactive, use recommended defaults')
    .option(
      '--config-format <ts|json|package-json>',
      'Config file format (default: ts)',
    )
    .option('--force', 'Overwrite existing config')
    .option('--dry-run', 'Print what would be written, touch nothing')
    .action(async (dir: string | undefined, flags: InitCliFlags) => {
      try {
        await runInit(dir ?? '.', flags);
      } catch (err) {
        process.stderr.write(`${err instanceof Error ? err.message : err}\n`);
        process.exitCode = 2;
      }
    });

  cli.help();
  cli.version(readVersion());
  cli.parse(argv, { run: false });
  await cli.runMatchedCommand();
  return process.exitCode ?? 0;
}
