import { dirname } from 'node:path';
import { runPnpmList, runNpmList } from './exec-list.js';

export async function listVueResolutions(
  packageJsonPath: string,
): Promise<string[]> {
  const rootDir = dirname(packageJsonPath);

  const pnpmResult = await runPnpmList(rootDir);
  if (pnpmResult.error === null) {
    return pnpmResult.versions;
  }

  const npmResult = await runNpmList(rootDir);
  if (npmResult.error === null) {
    return npmResult.versions;
  }

  return [];
}
