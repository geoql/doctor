import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  audit,
  encodeAnnotations,
  format,
  listChangedFiles,
  loadDoctorConfig,
  mergeCliOverrides,
  type ReporterFormat,
  type ReporterInput,
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

interface CliFlags {
  format?: string;
  config?: string;
  failOn?: string;
  json?: boolean;
  jsonCompact?: boolean;
  color?: boolean;
  quiet?: boolean;
  output?: string;
  rule?: string | string[];
  include?: string | string[];
  exclude?: string | string[];
  deadCode?: boolean;
  threshold?: string;
  score?: boolean;
  annotations?: boolean;
  diff?: boolean;
  staged?: boolean;
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
    kind === 'json-compact'
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
      'Output format (agent|pretty|json|json-compact)',
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
    .option('--no-color', 'Disable colored output')
    .option(
      '--rule <id:level>',
      'Override a rule (repeatable), e.g. --rule a/b:off',
    )
    .option('--include <glob>', 'Glob of files to include (repeatable)')
    .option('--exclude <glob>', 'Glob of files to exclude (repeatable)')
    .option('--no-dead-code', 'Skip the dead-code (knip) analysis pass')
    .option('--threshold <n>', 'Minimum passing score (0-100)')
    .option('--score', 'Output only the numeric score (for piping)')
    .option('--annotations', 'Emit GitHub Actions ::error::/::warning:: lines')
    .option('--diff', 'Only report findings in files changed vs HEAD')
    .option('--staged', 'Only report findings in staged files')
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
        let scopeFiles: string[] | undefined;
        if (flags.diff || flags.staged) {
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
          scopeFiles,
        });
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

  cli.help();
  cli.version(readVersion());
  cli.parse(argv, { run: false });
  await cli.runMatchedCommand();
  return process.exitCode ?? 0;
}
