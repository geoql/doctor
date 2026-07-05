import type { ScoreResult } from '../score.js';
import type { Diagnostic } from '../types.js';
import type { Framework } from '../types/project-info.js';

export interface ProjectInfoLite {
  readonly framework: Framework;
  readonly frameworkDetected: boolean;
  readonly vueVersion: string | null;
  readonly nuxtVersion: string | null;
  readonly capabilities: readonly string[];
  readonly rootDirectory: string;
}

export interface ReporterInput {
  readonly toolName: string;
  readonly toolVersion: string;
  readonly rootDirectory: string;
  readonly analyzedFileCount: number;
  readonly elapsedMs: number;
  readonly diagnostics: readonly Diagnostic[];
  readonly score: ScoreResult;
  readonly projectInfo: ProjectInfoLite;
}

export interface ReporterOptions {
  readonly color?: boolean;
  readonly quiet?: boolean;
}
