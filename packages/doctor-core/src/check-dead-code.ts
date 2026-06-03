import { join } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import type { Diagnostic } from './types.js';
import type { KnipConfig } from './dead-code/build-knip-config.js';
import type { ProjectInfo } from './types/project-info.js';
import type { ResolvedDoctorConfig } from './config/types.js';
import { buildKnipConfig } from './dead-code/build-knip-config.js';
import { dedupeDeadCodeAgainstLint } from './dead-code/dedupe.js';
import {
  DeadCodeImportFailed,
  DeadCodeTimeoutError,
} from './dead-code/errors.js';
import { mapKnipDiagnostic } from './dead-code/map-knip-diagnostic.js';
import type { KnipIssue, KnipIssueKind } from './dead-code/types.js';

interface CheckDeadCodeOptions {
  projectInfo: ProjectInfo;
  doctorConfig: ResolvedDoctorConfig;
  enabled: boolean;
  timeoutMs?: number;
}

interface KnipIssueEntry {
  filePath: string;
  symbol: string;
  line?: number;
  col?: number;
  type: string;
}

type KnipIssueRecords = Record<string, Record<string, KnipIssueEntry>>;

interface KnipIssues {
  files: KnipIssueRecords;
  exports: KnipIssueRecords;
  types: KnipIssueRecords;
  deps: KnipIssueRecords;
  devDependencies: KnipIssueRecords;
  unlisted: KnipIssueRecords;
  duplicates: KnipIssueRecords;
  enumMembers: KnipIssueRecords;
  namespaceMembers: KnipIssueRecords;
  nsExports: KnipIssueRecords;
  nsTypes: KnipIssueRecords;
  optionalPeerDependencies: KnipIssueRecords;
  binaries: KnipIssueRecords;
  unresolved: KnipIssueRecords;
  catalog: KnipIssueRecords;
}

const MAPPED_KINDS: KnipIssueKind[] = [
  'files',
  'exports',
  'types',
  'deps',
  'devDependencies',
  'unlisted',
  'duplicates',
  'enumMembers',
  'namespaceMembers',
];

function flattenKnipIssues(issues: KnipIssues): KnipIssue[] {
  const out: KnipIssue[] = [];
  for (const kind of MAPPED_KINDS) {
    const records = issues[kind];
    if (!records) continue;
    for (const filePath of Object.keys(records)) {
      const symbols = records[filePath];
      for (const symbolName of Object.keys(symbols)) {
        const entry = symbols[symbolName];
        out.push({
          file: entry.filePath,
          symbol: entry.symbol,
          line: entry.line,
          col: entry.col,
          kind,
        });
      }
    }
  }
  return out;
}

export const _knipLoader = {
  load: async (): Promise<{
    createOptions: (opts: { cwd: string }) => Promise<Record<string, unknown>>;
    run: (
      opts: Record<string, unknown>,
    ) => Promise<{ results: { issues: KnipIssues } }>;
  }> => {
    const require = createRequire(import.meta.url);
    const knipMainPath = require.resolve('knip');
    const knipDir = knipMainPath.replace(/\/dist\/index\.js$/, '');

    const { pathToFileURL } = await import('node:url');
    const createOptionsUrl = pathToFileURL(
      join(knipDir, 'dist', 'util', 'create-options.js'),
    ).href;
    const runUrl = pathToFileURL(join(knipDir, 'dist', 'run.js')).href;

    const createOptionsModule = (await import(createOptionsUrl)) as {
      createOptions: (opts: {
        cwd: string;
      }) => Promise<Record<string, unknown>>;
    };
    const runModule = (await import(runUrl)) as {
      run: (
        opts: Record<string, unknown>,
      ) => Promise<{ results: { issues: KnipIssues } }>;
    };

    return {
      createOptions: createOptionsModule.createOptions,
      run: runModule.run,
    };
  },
};

async function writeKnipConfig(
  rootDir: string,
  config: KnipConfig,
): Promise<string> {
  const cacheDir = join(rootDir, 'node_modules', '.cache', 'doctor');
  await mkdir(cacheDir, { recursive: true });
  const configPath = join(cacheDir, 'knip.json');
  const knipJson: Record<string, unknown> = {
    entry: config.entry,
    project: config.project,
    ignore: config.ignoreFiles,
    ignoreDependencies: config.ignoreDependencies,
  };
  if (config.compilers) knipJson.compilers = config.compilers;
  await writeFile(configPath, JSON.stringify(knipJson, null, 2), 'utf8');
  return configPath;
}

export async function checkDeadCode(
  options: CheckDeadCodeOptions,
): Promise<Diagnostic[]> {
  if (!options.enabled) return [];

  const config = buildKnipConfig(options.projectInfo, options.doctorConfig);
  const timeoutMs = options.timeoutMs ?? 30_000;

  let createOptions: (opts: {
    cwd: string;
  }) => Promise<Record<string, unknown>>;
  let run: (
    opts: Record<string, unknown>,
  ) => Promise<{ results: { issues: KnipIssues } }>;
  try {
    const internals = await _knipLoader.load();
    createOptions = internals.createOptions;
    run = internals.run;
  } catch (err) {
    throw new DeadCodeImportFailed(err);
  }

  // knip's createOptions IGNORES entry/project passed as options (its Options
  // type has no such fields). The only programmatic way to inject them is via a
  // config file referenced through args.config — so synthesize one on disk and
  // point knip at it. Without this, knip falls back to its default entry globs
  // ({index,cli,main}) and reports auto-imported/file-routed files as unused.
  const configPath = await writeKnipConfig(
    options.projectInfo.rootDirectory,
    config,
  );

  const knipOptions = await createOptions({
    cwd: options.projectInfo.rootDirectory,
    args: { config: configPath },
  });

  const result = await Promise.race([
    run(knipOptions),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new DeadCodeTimeoutError(timeoutMs)), timeoutMs),
    ),
  ]);

  const allIssues = flattenKnipIssues(result.results.issues);
  const diagnostics = allIssues
    .map((issue) => mapKnipDiagnostic(options.projectInfo.rootDirectory, issue))
    .filter((d): d is Diagnostic => d !== null);

  diagnostics.sort((a, b) => {
    if (a.file !== b.file) return a.file < b.file ? -1 : 1;
    if (a.line !== b.line) return a.line - b.line;
    return a.ruleId.localeCompare(b.ruleId);
  });

  return diagnostics;
}

export {
  dedupeDeadCodeAgainstLint,
  DeadCodeImportFailed,
  DeadCodeTimeoutError,
};
