import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  audit,
  encodeAnnotations,
  format,
  listChangedFiles,
  listRules,
  loadDoctorConfig,
  loadRuleDoc,
  mergeCliOverrides,
  renderVerboseTrace,
  type ListRulesFilter,
  type RegisteredRule,
  type ReporterFormat,
  type ReporterInput,
  type RuleCategory,
  type RuleSource,
  type Severity,
} from '@geoql/doctor-core';
import { cac } from 'cac';

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
  diff?: boolean;
  staged?: boolean;
  full?: boolean;
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
  if (flags.jsonCompact) return 'json-compact';
  if (flags.json) return 'json';
  const kind = flags.format;
  if (
    kind === 'agent' ||
    kind === 'pretty' ||
    kind === 'json' ||
    kind === 'json-compact' ||
    kind === 'sarif'
  ) {
    return kind;
  }
  return 'agent';
}

function isSeverity(v: string): v is 'error' | 'warn' {
  return v === 'error' || v === 'warn';
}

export async function run(argv: string[] = process.argv): Promise<number> {
  const cli = cac('vue-doctor');

  cli
    .command('[path]', 'Audit a Vue project')
    .option(
      '--format <kind>',
      'Output format (agent|pretty|json|json-compact|sarif)',
      {
        default: 'agent',
      },
    )
    .option('--json', 'Shorthand for --format json')
    .option('--json-compact', 'Emit single-line JSON')
    .option('--config <path>', 'Path to doctor.config.ts')
    .option(
      '--fail-on <level>',
      'Exit non-zero on this severity or worse (error|warn)',
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
    .option('--no-dead-code', 'Skip the dead-code (knip) analysis pass')
    .option('--no-lint', 'Skip the lint passes (template/SFC/oxlint)')
    .option(
      '--no-respect-inline-disables',
      'Surface findings even inside doctor-disable comments',
    )
    .option('--threshold <n>', 'Minimum passing score (0-100)')
    .option('--score', 'Output only the numeric score (for piping)')
    .option('--annotations', 'Emit GitHub Actions ::error::/::warning:: lines')
    .option('--diff', 'Only report findings in files changed vs HEAD')
    .option('--staged', 'Only report findings in staged files')
    .option('--full', 'Force a complete scan (overrides --diff/--staged)')
    .option('--output <file>', 'Write the report to a file instead of stdout')
    .action(async (path: string | undefined, flags: CliFlags) => {
      const reporter = resolveFormat(flags);
      const failOn =
        flags.failOn && isSeverity(flags.failOn) ? flags.failOn : 'error';
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
        let scopeFiles: string[] | undefined;
        if (!flags.full && (flags.diff || flags.staged)) {
          scopeFiles = await listChangedFiles({
            rootDir,
            mode: flags.staged ? 'staged' : 'diff',
          });
        }
        const resolved = await loadDoctorConfig(rootDir, flags.config);
        const merged = mergeCliOverrides(resolved, {
          failOn,
          include: toArray(flags.include),
          exclude: toArray(flags.exclude),
          rules: ruleOverrides,
          threshold,
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
        if (flags.verbose) {
          const verboseOutput = renderVerboseTrace(report, {
            configSource: resolved.source,
          });
          process.stderr.write(`${verboseOutput}\n`);
        }
        if (flags.score) {
          process.stdout.write(`${report.score}\n`);
          process.exitCode = report.exitCode;
          return;
        }
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
        if (
          flags.annotations &&
          reporter !== 'json' &&
          reporter !== 'json-compact' &&
          report.diagnostics.length > 0
        ) {
          process.stdout.write(`${encodeAnnotations(report.diagnostics)}\n`);
        }
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

  cli.help();
  cli.version(readVersion());
  cli.parse(argv, { run: false });
  await cli.runMatchedCommand();
  return process.exitCode ?? 0;
}
