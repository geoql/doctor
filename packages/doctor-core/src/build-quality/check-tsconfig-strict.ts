import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { ProjectInfo } from '../types/project-info.js';
import type { BuildQualityIssue } from './types.js';
import { stripJsonComments } from './strip-json-comments.js';

const RULE_ID = 'vue-doctor/build-quality/tsconfig-strict-required';
const DOCS = 'https://www.typescriptlang.org/tsconfig#strict';

interface TsconfigShape {
  compilerOptions?: { strict?: unknown };
}

export async function checkTsconfigStrict(
  projectInfo: ProjectInfo,
): Promise<BuildQualityIssue[]> {
  if (projectInfo.packageJsonPath === null) return [];

  const tsconfigPath = join(
    dirname(projectInfo.packageJsonPath),
    'tsconfig.json',
  );

  let parsed: TsconfigShape;
  try {
    const source = await readFile(tsconfigPath, 'utf8');
    parsed = JSON.parse(stripJsonComments(source)) as TsconfigShape;
  } catch {
    return [];
  }

  if (parsed.compilerOptions?.strict === true) return [];

  return [
    {
      ruleId: RULE_ID,
      file: tsconfigPath,
      line: 1,
      column: 1,
      severity: 'warn',
      message: `tsconfig.json should set compilerOptions.strict to true for full type safety. See ${DOCS}`,
      recommendation: 'Set "strict": true in tsconfig.json compilerOptions.',
    },
  ];
}
