import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { detectProject } from '../detect-project.js';
import { listSourceFiles } from '../file-scan.js';
import { pathExists } from '../project-info/path-exists.js';
import type { DoctorUserConfig } from '../config/types.js';
import type { ProjectInfo } from '../types/project-info.js';

export type InitConfigFormat = 'ts' | 'json' | 'package-json';
export type InitPreset = 'recommended' | 'strict' | 'minimal';

export interface RawInitAnswers {
  target?: InitConfigFormat;
  preset?: InitPreset;
  threshold?: number;
  exclude?: string;
}

export interface ResolvedInitAnswers {
  configFormat: InitConfigFormat;
  preset: InitPreset;
  threshold: number | undefined;
  exclude: string[] | undefined;
}

export interface InitOptions {
  dir: string;
  configFormat: InitConfigFormat;
  preset: InitPreset;
  threshold: number | undefined;
  exclude: string[] | undefined;
  binName: string;
}

export interface InitFileWrite {
  path: string;
  content: string;
}

export interface InitPlan {
  writes: InitFileWrite[];
  conflict: boolean;
  conflictPath: string | null;
}

export function parseExcludeList(
  raw: string | undefined,
): string[] | undefined {
  if (!raw) return undefined;
  const parts = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return parts.length > 0 ? parts : undefined;
}

export function normalizeInitAnswers(raw: RawInitAnswers): ResolvedInitAnswers {
  return {
    configFormat: raw.target ?? 'ts',
    preset: raw.preset ?? 'recommended',
    threshold: typeof raw.threshold === 'number' ? raw.threshold : undefined,
    exclude: parseExcludeList(raw.exclude),
  };
}

function frameworkLabel(project: ProjectInfo): string {
  if (project.framework === 'nuxt') {
    return `Nuxt ${project.nuxtVersion ?? 'unknown'}`;
  }
  if (project.framework === 'vue') {
    return `Vue ${project.vueVersion ?? 'unknown'}`;
  }
  return 'unknown project';
}

export function renderDetectSummary(
  project: ProjectInfo,
  sfcCount: number,
): string {
  const ts = project.capabilities.has('typescript') ? ' · TS' : '';
  const noun = sfcCount === 1 ? 'SFC' : 'SFCs';
  return `detected: ${frameworkLabel(project)}${ts} · ${sfcCount} ${noun}`;
}

export async function detectSummary(dir: string): Promise<string> {
  const project = await detectProject(dir);
  const sfcs = await listSourceFiles({
    rootDir: dir,
    include: ['**/*.vue'],
    exclude: ['**/node_modules/**'],
  });
  return renderDetectSummary(project, sfcs.length);
}

function buildUserConfig(options: InitOptions): DoctorUserConfig {
  const config: DoctorUserConfig = { preset: options.preset };
  if (options.threshold !== undefined) config.threshold = options.threshold;
  if (options.exclude && options.exclude.length > 0) {
    config.exclude = options.exclude;
  }
  return config;
}

function renderTsConfig(options: InitOptions): string {
  const config = buildUserConfig(options);
  const lines = [
    "import { defineConfig } from '@geoql/doctor-core';",
    '',
    'export default defineConfig({',
    `  preset: '${config.preset}',`,
  ];
  if (config.threshold !== undefined) {
    lines.push(`  threshold: ${config.threshold},`);
  }
  if (config.exclude) {
    const globs = config.exclude.map((glob) => `'${glob}'`).join(', ');
    lines.push(`  exclude: [${globs}],`);
  }
  lines.push('});');
  return `${lines.join('\n')}\n`;
}

function renderJsonConfig(options: InitOptions): string {
  return `${JSON.stringify(buildUserConfig(options), null, 2)}\n`;
}

interface MutablePackageJson {
  scripts?: Record<string, string>;
  doctor?: DoctorUserConfig;
  [key: string]: unknown;
}

async function readPackageJsonRaw(
  path: string,
): Promise<MutablePackageJson | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as MutablePackageJson;
  } catch {
    return null;
  }
}

export async function planInit(options: InitOptions): Promise<InitPlan> {
  const writes: InitFileWrite[] = [];
  const packageJsonPath = join(options.dir, 'package.json');
  const existingPkg = await readPackageJsonRaw(packageJsonPath);
  const pkg: MutablePackageJson = { ...(existingPkg ?? {}) };

  let conflict = false;
  let conflictPath: string | null = null;

  if (options.configFormat === 'package-json') {
    if (pkg.doctor !== undefined) {
      conflict = true;
      conflictPath = packageJsonPath;
    }
    pkg.doctor = buildUserConfig(options);
  } else {
    const fileName =
      options.configFormat === 'ts' ? 'doctor.config.ts' : 'doctor.config.json';
    const configPath = join(options.dir, fileName);
    if (await pathExists(configPath)) {
      conflict = true;
      conflictPath = configPath;
    }
    const content =
      options.configFormat === 'ts'
        ? renderTsConfig(options)
        : renderJsonConfig(options);
    writes.push({ path: configPath, content });
  }

  pkg.scripts = { ...(pkg.scripts ?? {}), 'doctor:check': options.binName };
  writes.push({
    path: packageJsonPath,
    content: `${JSON.stringify(pkg, null, 2)}\n`,
  });

  return { writes, conflict, conflictPath };
}
