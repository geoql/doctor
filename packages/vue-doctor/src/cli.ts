import { resolve } from 'node:path';
import process from 'node:process';
import {
  audit,
  format,
  loadAuditConfig,
  type ReporterFormat,
} from '@geoql/doctor-core';
import { cac } from 'cac';

interface CliFlags {
  format?: string;
  config?: string;
  failOn?: string;
}

function isReporter(v: string): v is ReporterFormat {
  return v === 'text' || v === 'json';
}

function isSeverity(v: string): v is 'error' | 'warning' {
  return v === 'error' || v === 'warning';
}

export async function run(argv: string[] = process.argv): Promise<number> {
  const cli = cac('vue-doctor');

  cli
    .command('[path]', 'Audit a Vue project')
    .option('--format <kind>', 'Output format (text|json)', { default: 'text' })
    .option('--config <path>', 'Path to doctor.config.ts')
    .option(
      '--fail-on <level>',
      'Exit non-zero on this severity or worse (error|warning)',
      {
        default: 'error',
      },
    )
    .action(async (path: string | undefined, flags: CliFlags) => {
      const reporter =
        flags.format && isReporter(flags.format) ? flags.format : 'text';
      const failOn =
        flags.failOn && isSeverity(flags.failOn) ? flags.failOn : 'error';
      const rootDir = resolve(path ?? '.');

      try {
        const { config } = await loadAuditConfig(rootDir, flags.config);
        const report = await audit({ ...config, rootDir, failOn });
        const out = format(report, reporter);
        process.stdout.write(out);
        process.stdout.write('\n');
        process.exitCode = report.exitCode;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(`vue-doctor: ${msg}\n`);
        process.exitCode = 2;
      }
    });

  cli.help();
  cli.version('0.0.0');
  cli.parse(argv, { run: false });
  await cli.runMatchedCommand();
  return process.exitCode ?? 0;
}
