import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  audit,
  format,
  loadAuditConfig,
  type ReporterFormat,
  type ReporterInput,
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
    .action(async (path: string | undefined, flags: CliFlags) => {
      const reporter = resolveFormat(flags);
      const failOn =
        flags.failOn && isSeverity(flags.failOn) ? flags.failOn : 'error';
      const rootDir = resolve(path ?? '.');

      try {
        const { config } = await loadAuditConfig(rootDir, flags.config);
        const report = await audit({ ...config, rootDir, failOn });
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
        process.stdout.write(out);
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
