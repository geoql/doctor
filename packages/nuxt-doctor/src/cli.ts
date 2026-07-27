import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
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
  pushFindings,
  scaffoldCiWorkflow,
  renderVerboseTrace,
  scoreDiagnostics,
  filterReportByRules,
  filterRuleIdsByCategory,
  resolveCategoryScope,
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
import { runDesignScan } from './design.js';
import { cac } from 'cac';
import prompts from 'prompts';
import { runInstallSkill } from './install/install-skill.js';

interface InstallCliFlags {
  yes?: boolean;
  force?: boolean;
  dryRun?: boolean;
}

interface DesignCliFlags {
  format?: string;
  failUnder?: string | number;
}

interface CiInstallCliFlags {
  pr?: boolean;
  comments?: boolean;
  provider?: string;
  yes?: boolean;
  force?: boolean;
  dryRun?: boolean;
}

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
  lines.push(`@geoql/nuxt-doctor v${readVersion()} — project capabilities`);
  lines.push('');
  lines.push('framework');
  lines.push(`  ${p.framework}`);
  lines.push(`  nuxt: ${p.nuxtVersion ?? '(none)'}`);
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
  lines.push("run 'nuxt-doctor inspect --json' for machine output");
  lines.push(
    "run 'nuxt-doctor list-rules' to see which rules these capabilities enable",
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
  'structure',
  'modules-deps',
  'nitro',
  'seo',
  'cloudflare',
  'server-routes',
  'hydration',
  'data-fetching',
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
    `@geoql/nuxt-doctor — ${rules.length} rule${rules.length === 1 ? '' : 's'}`,
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
  changedFilesFrom?: string;
  includeUntracked?: boolean;
  includeTestFiles?: boolean;
  full?: boolean;
  project?: string;
  prComment?: string | true;
  fix?: boolean;
  fixExclude?: string | string[];
  push?: boolean;
  pushUrl: string;
  apiKey?: string;
  pushProject?: string;
  pushWorkspace?: string;
  category?: string | string[];
  dimension?: string | string[];
  maxDuration?: string | number;
}

interface PreparedOptions {
  ruleOverrides: Record<string, Severity | 'off'> | undefined;
  threshold: number | undefined;
  categoryScope: ReadonlySet<RuleCategory> | undefined;
  maxDurationMs: number | undefined;
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

function parseMaxDurationMs(
  value: string | number | undefined,
): number | undefined {
  if (value === undefined) return undefined;
  const seconds = Number(value);
  if (!Number.isInteger(seconds) || seconds < 0) {
    throw new Error(
      `--max-duration must be a non-negative integer number of seconds, got "${value}".`,
    );
  }
  return seconds * 1000;
}

async function runSingleAudit(
  rootDir: string,
  flags: CliFlags,
  prepared: PreparedOptions,
): Promise<{ report: AuditReport; source: ConfigSource }> {
  let scopeFiles: string[] | undefined;
  const scopeActive =
    flags.diff === true ||
    flags.staged === true ||
    flags.changedFilesFrom !== undefined;
  if (!flags.full && scopeActive) {
    scopeFiles = await listChangedFiles({
      rootDir,
      mode: flags.changedFilesFrom
        ? 'changed-from'
        : flags.staged
          ? 'staged'
          : 'diff',
      ...(flags.changedFilesFrom ? { ref: flags.changedFilesFrom } : {}),
      ...(flags.includeUntracked ? { includeUntracked: true } : {}),
    });
  }
  const resolved = await loadDoctorConfig(rootDir, {
    ...(flags.config ? { explicitPath: flags.config } : {}),
    ...(flags.preset ? { presetOverride: flags.preset } : {}),
  });
  const fixExclude = toArray(flags.fixExclude);
  const merged: ResolvedDoctorConfig = mergeCliOverrides(resolved, {
    failOn: flags.failOn as 'error' | 'warn' | 'none' | undefined,
    include: toArray(flags.include),
    exclude: toArray(flags.exclude),
    rules: prepared.ruleOverrides,
    threshold: prepared.threshold,
    ...(fixExclude ? { fixExcludes: fixExclude } : {}),
    ...(flags.includeTestFiles ? { includeTestFiles: true } : {}),
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
    ...(merged.includeTestFiles !== undefined
      ? { includeTestFiles: merged.includeTestFiles }
      : {}),
    scopeFiles,
    fix: flags.fix,
    ...(merged.fixExcludes ? { fixExcludes: merged.fixExcludes } : {}),
    ...(prepared.maxDurationMs !== undefined
      ? { maxDurationMs: prepared.maxDurationMs }
      : {}),
  });
  let allowedRuleIds = new Set(Object.keys(merged.rules));
  if (prepared.categoryScope) {
    allowedRuleIds = filterRuleIdsByCategory(
      allowedRuleIds,
      prepared.categoryScope,
    );
  }
  const filtered = filterReportByRules(
    report,
    allowedRuleIds,
    merged.failOn,
    undefined,
    merged.includeTestFiles ?? false,
  );
  return { report: filtered, source: resolved.source };
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
  const skippedCheckReasons = reports.flatMap(
    (r) => r.skippedCheckReasons ?? [],
  );
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
    incomplete: reports.some((r) => r.incomplete),
    ...(skippedCheckReasons.length > 0 ? { skippedCheckReasons } : {}),
  };
}

function emitReport(
  report: AuditReport,
  reporter: ReporterFormat,
  flags: CliFlags,
): void {
  const input: ReporterInput = {
    toolName: '@geoql/nuxt-doctor',
    toolVersion: readVersion(),
    rootDirectory: report.rootDir,
    analyzedFileCount: report.filesScanned,
    elapsedMs: report.elapsedMs,
    diagnostics: report.diagnostics,
    score: report.scoreResult,
    projectInfo: report.projectInfo,
    incomplete: report.incomplete,
    ...(report.skippedCheckReasons
      ? { skippedCheckReasons: report.skippedCheckReasons }
      : {}),
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

async function maybePushFindings(
  report: AuditReport,
  flags: CliFlags,
  rootDir: string,
): Promise<void> {
  if (flags.push !== true) return;
  if (!flags.apiKey) {
    process.stderr.write(
      'nuxt-doctor: --push enabled but --api-key is not set; skipping push (no findings were sent).\n',
    );
    return;
  }
  const url = flags.pushUrl;
  // --push-project is intentionally separate from --project (the #27 workspace
  // aggregation filter); reusing --project would make the CLI treat the SaaS
  // slug as a workspace package name and audit nothing.
  const project: string =
    flags.pushProject && flags.pushProject.length > 0
      ? flags.pushProject
      : basename(rootDir);
  const workspace: string | undefined =
    flags.pushWorkspace && flags.pushWorkspace.length > 0
      ? flags.pushWorkspace
      : undefined;
  const result = await pushFindings({
    project,
    workspace,
    score: report.score,
    errorCount: report.errorCount,
    warnCount: report.warnCount,
    infoCount: report.infoCount,
    diagnostics: report.diagnostics,
    rootDir,
    url,
    apiKey: flags.apiKey,
  });
  if (result.ok) {
    process.stderr.write(
      `nuxt-doctor: pushed ${report.diagnostics.length} finding${report.diagnostics.length === 1 ? '' : 's'} to ${url} (HTTP ${result.status}).\n`,
    );
  } else {
    const detail =
      result.status !== undefined ? ` (HTTP ${result.status})` : '';
    process.stderr.write(
      `nuxt-doctor: --push failed${detail}: ${result.error}. Audit exit code is unchanged.\n`,
    );
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
        `nuxt-doctor: --project: unknown project "${name}" (skipped)\n`,
      );
      continue;
    }
    const single = await runSingleAudit(match.dir, flags, prepared);
    reports.push(single.report);
    source = single.source;
  }
  if (reports.length === 0) {
    process.stderr.write(
      'nuxt-doctor: --project: no matching workspace projects\n',
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
      `nuxt-doctor init: --config-format must be ts | json | package-json, got '${flags.configFormat}'\n`,
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
    binName: 'nuxt-doctor',
  });

  const summary = await detectSummary(targetDir);
  process.stdout.write(`${summary}\n`);

  if (plan.conflict && !flags.force) {
    process.stderr.write(
      `nuxt-doctor init: ${plan.conflictPath} already exists. Run with --force to overwrite.\n`,
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
        process.stderr.write('nuxt-doctor init: cancelled\n');
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

const VALID_CI_PROVIDERS = new Set(['github', 'gitlab', 'auto']);

async function runCiInstall(
  dir: string,
  flags: CiInstallCliFlags,
): Promise<void> {
  const targetDir = resolve(dir);
  const provider = flags.provider ?? 'auto';
  if (!VALID_CI_PROVIDERS.has(provider)) {
    process.stderr.write(
      `nuxt-doctor ci install: --provider must be github | gitlab | auto, got '${flags.provider}'\n`,
    );
    process.exitCode = 2;
    return;
  }

  const plan = await scaffoldCiWorkflow({
    bin: 'nuxt-doctor',
    framework: 'nuxt',
    dir: targetDir,
    provider: provider as 'github' | 'gitlab' | 'auto',
    pr: flags.pr === true,
    noComments: flags.comments === false,
    force: flags.force === true,
  });

  if (plan.conflict) {
    process.stderr.write(
      `nuxt-doctor ci install: ${plan.conflictPath} already exists. Run with --force to overwrite.\n`,
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

  if (!flags.yes) {
    const answers = await prompts(
      {
        type: 'confirm',
        name: 'confirm',
        message: `Scaffold the ${plan.provider} CI workflow at ${plan.writes[0]?.path}?`,
        initial: true,
      },
      {
        onCancel: () => {
          process.exitCode = 2;
        },
      },
    );
    if (process.exitCode === 2) return;
    if (!answers.confirm) {
      process.stdout.write('nuxt-doctor ci install: cancelled\n');
      process.exitCode = 0;
      return;
    }
  }

  for (const write of plan.writes) {
    mkdirSync(dirname(write.path), { recursive: true });
    writeFileSync(write.path, write.content, 'utf8');
    process.stdout.write(`nuxt-doctor ci install: wrote ${write.path}\n`);
  }
  process.exitCode = 0;
}

export async function run(argv: string[] = process.argv): Promise<number> {
  const cli = cac('nuxt-doctor');

  cli
    .command('[path]', 'Audit a Nuxt project')
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
      'Exit non-zero on this severity or worse (error|warn|none)',
      {
        default: 'error',
      },
    )
    .option('--quiet', 'Only show the summary')
    .option('--verbose', 'Emit per-pass timing and rule diagnostics to stderr')
    .option('--no-color', 'Disable colored output')
    .option(
      '--rule <id:level>',
      'Override a rule (repeatable), e.g. --rule a/b:off',
    )
    .option('--include <glob>', 'Glob of files to include (repeatable)')
    .option('--exclude <glob>', 'Glob of files to exclude (repeatable)')
    .option(
      '--category <name>',
      'Only score rules in this category (repeatable)',
    )
    .option(
      '--dimension <name>',
      'Only score this dimension: performance|correctness|security|maintainability|nuxt|design (repeatable)',
    )
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
    .option(
      '--changed-files-from <ref>',
      'Only report findings in source files changed since <ref> (e.g. origin/main)',
    )
    .option(
      '--include-untracked',
      'Fold non-ignored untracked files into --staged / --changed-files-from scope',
    )
    .option(
      '--include-test-files',
      'Score findings in test/story files too (excluded from the score by default)',
    )
    .option('--full', 'Force a complete scan (overrides scope flags)')
    .option(
      '--project <name>',
      'Comma-separated workspace project names to audit (monorepo)',
    )
    .option('--output <file>', 'Write the report to a file instead of stdout')
    .option('--pr-comment', 'Emit a focused Markdown PR-comment body')
    .option(
      '--fix',
      'Auto-fix oxlint-pass findings in place (built-in vue/* rules only; template/SFC/dead-code/project findings are not fixable). Skipped in --diff/--staged mode.',
    )
    .option(
      '--fix-exclude <ruleId>',
      'Mark a rule as not-auto-fixable (repeatable). Note: oxlint applies built-in fixes globally, so this is enforced only for doctor plugin fixes; built-in vue/* fixes still apply.',
    )
    .option(
      '--push',
      'After the audit, POST privacy-stripped findings to the SaaS. Requires --api-key. Negatable with --no-push.',
    )
    .option(
      '--push-url <url>',
      'SaaS endpoint for --push (default: https://app.the-doctor.report/api/v1/findings)',
      {
        default: 'https://app.the-doctor.report/api/v1/findings',
      },
    )
    .option(
      '--api-key <key>',
      'API key for the SaaS (sent as the x-api-key header for both --score-mode and --push).',
    )
    .option(
      '--push-project <slug>',
      'SaaS dashboard project slug for --push (e.g. owner/repo). Defaults to the audited directory name.',
    )
    .option(
      '--push-workspace <path>',
      'Monorepo sub-app path for --push (e.g. packages/my-lib) so multiple apps in one repo keep separate score series.',
    )
    .option(
      '--max-duration <seconds>',
      'Abort remaining audit passes after N seconds; the report gains incomplete=true + skippedCheckReasons',
    )
    .action(async (path: string | undefined, flags: CliFlags) => {
      const reporter = resolveFormat(flags);
      if (flags.failOn !== undefined && !isFailOnLevel(flags.failOn)) {
        process.stderr.write(
          `nuxt-doctor: --fail-on must be 'error', 'warn', or 'none', got '${flags.failOn}'\n`,
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
        const scopeSelectors = [
          flags.diff === true,
          flags.staged === true,
          flags.changedFilesFrom !== undefined,
        ].filter(Boolean).length;
        if (scopeSelectors > 1) {
          throw new Error(
            '--diff, --staged, and --changed-files-from are mutually exclusive.',
          );
        }
        if (flags.verbose && flags.quiet) {
          throw new Error('--verbose and --quiet are mutually exclusive.');
        }
        const fixActive = flags.fix === true;
        const fixSkippedForScope =
          fixActive && !flags.full && scopeSelectors > 0;
        if (fixSkippedForScope) {
          process.stderr.write(
            'nuxt-doctor: --fix skipped in --diff/--staged mode (auto-fix only runs on a full scan to avoid rewriting files outside the diff).\n',
          );
        }
        if (fixActive && flags.fixExclude !== undefined) {
          process.stderr.write(
            'nuxt-doctor: --fix-exclude is not enforced for built-in vue/* rules (oxlint applies their fixes globally); it currently scopes only future doctor plugin fixes.\n',
          );
        }
        const categoryScope = resolveCategoryScope({
          categories: toArray(flags.category),
          dimensions: toArray(flags.dimension),
        });
        const prepared: PreparedOptions = {
          ruleOverrides,
          threshold,
          categoryScope,
          maxDurationMs: parseMaxDurationMs(flags.maxDuration),
        };

        const workspacePackages = flags.project
          ? await listWorkspacePackages(rootDir)
          : [];
        if (flags.project && workspacePackages.length === 0) {
          process.stderr.write(
            'nuxt-doctor: --project ignored: not a pnpm workspace\n',
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
        if (fixActive && !fixSkippedForScope) {
          process.stderr.write(
            `nuxt-doctor: applied oxlint --fix; ${report.diagnostics.length} finding${report.diagnostics.length === 1 ? '' : 's'} remain (re-run to see them).\n`,
          );
        }
        if (flags.score) {
          process.stdout.write(`${report.score}\n`);
        } else {
          emitReport(report, reporter, flags);
        }
        await maybePushFindings(report, flags, rootDir);
        process.exitCode = report.exitCode;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(`nuxt-doctor: ${msg}\n`);
        process.exitCode = 2;
      }
    });

  cli
    .command(
      'list-rules',
      'List every registered rule with id, severity, category, source, and preset membership',
    )
    .alias('rules')
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
        process.stderr.write(`nuxt-doctor list-rules: ${msg}\n`);
        process.exitCode = 2;
      }
    });

  cli
    .command(
      'explain <ruleId>',
      "Print the rule's severity, category, recommendation, and helpUri",
    )
    .alias('why')
    .option('--json', 'Emit structured JSON instead of formatted text')
    .action(async (ruleId: string, flags: ExplainCliFlags) => {
      const doc = loadRuleDoc(ruleId);
      if (!doc) {
        process.stderr.write(
          `nuxt-doctor explain: unknown rule '${ruleId}'. Try \`nuxt-doctor list-rules\` to see registered rules.\n`,
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

  cli
    .command(
      'install [dir]',
      'Scaffold the nuxt-doctor agent skill so AI agents run doctor after changes',
    )
    .option('-y, --yes', 'Non-interactive, write defaults without prompting')
    .option('--force', 'Overwrite an existing skill')
    .option('--dry-run', 'Print what would be written, touch nothing')
    .action(async (dir: string | undefined, flags: InstallCliFlags) => {
      try {
        await runInstallSkill({
          dir: dir ?? '.',
          version: readVersion(),
          yes: flags.yes,
          force: flags.force,
          dryRun: flags.dryRun,
        });
      } catch (err) {
        process.stderr.write(
          `nuxt-doctor install: ${err instanceof Error ? err.message : err}\n`,
        );
        process.exitCode = 2;
      }
    });

  cli
    .command(
      'ci <action> [dir]',
      "CI integrations. Action 'install' scaffolds a workflow referencing geoql/doctor-action@v2",
    )
    .option('--pr', 'Also scaffold a PR-review workflow')
    .option('--no-comments', 'Disable PR comments (sets pr-comment=false)')
    .option(
      '--provider <name>',
      'CI provider: github | gitlab | auto (default: auto)',
    )
    .option('-y, --yes', 'Non-interactive, write defaults without prompting')
    .option('--force', 'Overwrite an existing workflow')
    .option('--dry-run', 'Print what would be written, touch nothing')
    .action(
      async (
        action: string,
        dir: string | undefined,
        flags: CiInstallCliFlags,
      ) => {
        if (action !== 'install') {
          process.stderr.write(
            `nuxt-doctor ci: unknown action '${action}' (expected: install)\n`,
          );
          process.exitCode = 2;
          return;
        }
        try {
          await runCiInstall(dir ?? '.', flags);
        } catch (err) {
          process.stderr.write(
            `nuxt-doctor ci install: ${err instanceof Error ? err.message : err}\n`,
          );
          process.exitCode = 2;
        }
      },
    );

  cli
    .command(
      'design [dir]',
      'Focused design-quality scan (a11y, states, polish) via shadscan-vue',
    )
    .option('--format <name>', 'Output format: human | json | agent')
    .option('--fail-under <score>', 'Exit 1 when the design score is below N')
    .action(async (dir: string | undefined, flags: DesignCliFlags) => {
      try {
        const result = await runDesignScan(dir ?? '.', {
          format: flags.format,
          failUnder:
            flags.failUnder === undefined ? undefined : Number(flags.failUnder),
        });
        process.stdout.write(`${result.output}\n`);
        if (result.exitCode !== 0) process.exitCode = result.exitCode;
      } catch (err) {
        process.stderr.write(
          `nuxt-doctor design: ${err instanceof Error ? err.message : err}\n`,
        );
        process.exitCode = 2;
      }
    });

  cli.help();
  cli.version(readVersion());
  cli.parse(argv, { run: false });
  await cli.runMatchedCommand();
  return process.exitCode ?? 0;
}
