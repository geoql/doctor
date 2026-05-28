import process from 'node:process';
import { cac } from 'cac';

export async function run(argv: string[] = process.argv): Promise<number> {
  const cli = cac('vue-doctor');

  cli
    .command('[path]', 'Audit a Vue project')
    .option('--format <kind>', 'Output format', { default: 'text' })
    .option('--config <path>', 'Path to doctor.config.ts')
    .option('--fail-on <level>', 'Exit non-zero on this severity or worse', {
      default: 'error',
    })
    .action(() => {
      console.error(
        'vue-doctor: not yet implemented; see docs/ARCHITECTURE.md.',
      );
      process.exitCode = 2;
    });

  cli.help();
  cli.version('0.0.0');
  cli.parse(argv, { run: true });
  return process.exitCode ?? 0;
}
