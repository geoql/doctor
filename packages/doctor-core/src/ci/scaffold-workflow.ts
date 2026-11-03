import { join } from 'node:path';
import process from 'node:process';
import { pathExists } from '../project-info/path-exists.js';
import type { InitFileWrite } from '../init/index.js';
import { detectCiProvider } from './provider-detect.js';

export interface CiScaffoldOptions {
  bin: 'vue-doctor' | 'nuxt-doctor';
  framework: 'vue' | 'nuxt';
  dir: string;
  provider?: 'github' | 'gitlab' | 'auto';
  pr?: boolean;
  noComments?: boolean;
  force?: boolean;
  env?: Readonly<Record<string, string | undefined>>;
  /**
   * Project directory relative to `dir` (the repository root) when the
   * project is a nested package. Emitted as the action's
   * `working-directory` (GitHub) or a `cd` (GitLab). Omit or `''` for a
   * project at the repository root.
   */
  workingDirectory?: string;
}

export interface CiScaffoldPlan {
  writes: InitFileWrite[];
  conflict: boolean;
  conflictPath: string | null;
  provider: 'github' | 'gitlab';
}

function workingDirectoryInput(workingDirectory: string): string {
  return workingDirectory
    ? `\n          working-directory: ${workingDirectory}`
    : '';
}

function renderGithubWorkflow(opts: {
  framework: 'vue' | 'nuxt';
  prComment: boolean;
  workingDirectory: string;
}): string {
  return `name: doctor

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read
  pull-requests: write

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - name: Run doctor
        uses: geoql/doctor-action@v2
        with:
          framework: ${opts.framework}${workingDirectoryInput(opts.workingDirectory)}
          preset: recommended
          threshold: '0'
          fail-on: error
          pr-comment: '${opts.prComment}'
          api-key: \${{ secrets.DOCTOR_API_KEY }}
          project: \${{ github.repository }}
`;
}

function renderGithubPrWorkflow(opts: {
  framework: 'vue' | 'nuxt';
  workingDirectory: string;
}): string {
  return `name: doctor-pr

on:
  pull_request:

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0

      - name: Doctor PR review
        uses: geoql/doctor-action@v2
        with:
          framework: ${opts.framework}${workingDirectoryInput(opts.workingDirectory)}
          preset: recommended
          fail-on: error
          diff: 'true'
          pr-comment: 'true'
          comment-mode: both
          api-key: \${{ secrets.DOCTOR_API_KEY }}
          project: \${{ github.repository }}
`;
}

function renderGitlabPipeline(opts: {
  bin: string;
  workingDirectory: string;
}): string {
  const cd = opts.workingDirectory ? `cd ${opts.workingDirectory} && ` : '';
  return `# Doctor quality gate — https://docs.the-doctor.report
doctor:
  image: node:24
  stage: test
  script:
    - ${cd}npx -y @geoql/${opts.bin}@latest --fail-on error
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
`;
}

export async function scaffoldCiWorkflow(
  opts: CiScaffoldOptions,
): Promise<CiScaffoldPlan> {
  const requested = opts.provider ?? 'auto';
  let provider: 'github' | 'gitlab';
  if (requested === 'auto') {
    const detected = detectCiProvider(opts.env ?? process.env);
    provider = detected === 'gitlab' ? 'gitlab' : 'github';
  } else {
    provider = requested;
  }

  const workingDirectory = (opts.workingDirectory ?? '').replace(/\\/g, '/');
  const writes: InitFileWrite[] = [];
  let conflict = false;
  let conflictPath: string | null = null;

  if (provider === 'gitlab') {
    const pipelinePath = join(opts.dir, '.gitlab-ci.yml');
    if (!opts.force && (await pathExists(pipelinePath))) {
      conflict = true;
      conflictPath = pipelinePath;
    } else {
      writes.push({
        path: pipelinePath,
        content: renderGitlabPipeline({ bin: opts.bin, workingDirectory }),
      });
    }
    return { writes, conflict, conflictPath, provider };
  }

  const workflowPath = join(opts.dir, '.github', 'workflows', 'doctor.yml');
  if (!opts.force && (await pathExists(workflowPath))) {
    conflict = true;
    conflictPath = workflowPath;
    return { writes, conflict, conflictPath, provider };
  }

  writes.push({
    path: workflowPath,
    content: renderGithubWorkflow({
      framework: opts.framework,
      prComment: opts.noComments !== true,
      workingDirectory,
    }),
  });

  if (opts.pr === true) {
    writes.push({
      path: join(opts.dir, '.github', 'workflows', 'doctor-pr.yml'),
      content: renderGithubPrWorkflow({
        framework: opts.framework,
        workingDirectory,
      }),
    });
  }

  return { writes, conflict, conflictPath, provider };
}
