import { resolve } from 'node:path';
import { glob } from 'tinyglobby';

export interface ScanOptions {
  rootDir: string;
  include: string[];
  exclude: string[];
}

export async function listSourceFiles(opts: ScanOptions): Promise<string[]> {
  const files = await glob(opts.include, {
    cwd: opts.rootDir,
    absolute: true,
    ignore: opts.exclude,
    onlyFiles: true,
    dot: false,
  });
  return files.map((f) => resolve(f)).sort();
}
