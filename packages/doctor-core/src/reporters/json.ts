import { relative } from 'node:path';
import type { Severity, SkippedCheckReason } from '../types.js';
import type { ReporterInput } from './types.js';

export const DOCTOR_REPORT_SCHEMA_VERSION = '1';

export interface DoctorReportDiagnostic {
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  ruleId: string;
  severity: Severity;
  message: string;
  source: string;
  recommendation?: string;
}

export interface DoctorReportBreakdownEntry {
  ruleId: string;
  occurrences: number;
  weightPerOccurrence: number;
  penalty: number;
}

export interface DoctorReport {
  schemaVersion: string;
  tool: { name: string; version: string };
  projectInfo: {
    framework: string;
    frameworkDetected: boolean;
    vueVersion: string | null;
    nuxtVersion: string | null;
    capabilities: string[];
    rootDirectory: string;
  };
  score: {
    value: number;
    threshold: number;
    passed: boolean;
    bySeverity: { error: number; warn: number; info: number };
    breakdown: DoctorReportBreakdownEntry[];
    byDimension: Record<
      string,
      {
        score: number;
        totalFindings: number;
        error: number;
        warn: number;
        info: number;
      }
    >;
  };
  diagnostics: DoctorReportDiagnostic[];
  timing: { elapsedMs: number; analyzedFileCount: number };
  incomplete?: boolean;
  skippedCheckReasons?: SkippedCheckReason[];
}

export function buildDoctorReport(input: ReporterInput): DoctorReport {
  return {
    schemaVersion: DOCTOR_REPORT_SCHEMA_VERSION,
    tool: { name: input.toolName, version: input.toolVersion },
    projectInfo: {
      framework: input.projectInfo.framework,
      frameworkDetected: input.projectInfo.frameworkDetected,
      vueVersion: input.projectInfo.vueVersion,
      nuxtVersion: input.projectInfo.nuxtVersion,
      capabilities: [...input.projectInfo.capabilities].sort(),
      rootDirectory: input.projectInfo.rootDirectory,
    },
    score: {
      value: input.score.score,
      threshold: input.score.threshold,
      passed: input.score.passed,
      bySeverity: {
        error: input.score.errorCount,
        warn: input.score.warnCount,
        info: input.score.infoCount,
      },
      breakdown: input.score.breakdown.map((entry) => ({
        ruleId: entry.ruleId,
        occurrences: entry.occurrences,
        weightPerOccurrence: entry.weightPerOccurrence,
        penalty: entry.penalty,
      })),
      byDimension: Object.fromEntries(
        Object.entries(input.score.byDimension).map(([dim, d]) => [
          dim,
          {
            score: d.score,
            totalFindings: d.totalFindings,
            error: d.errorCount,
            warn: d.warnCount,
            info: d.infoCount,
          },
        ]),
      ),
    },
    diagnostics: input.diagnostics.map((d) => ({
      file: relative(input.rootDirectory, d.file).replaceAll('\\', '/'),
      line: d.line,
      column: d.column,
      endLine: d.endLine,
      endColumn: d.endColumn,
      ruleId: d.ruleId,
      severity: d.severity,
      message: d.message,
      source: d.source,
      recommendation: d.recommendation,
      ...(d.surface ? { surface: d.surface } : {}),
    })),
    timing: {
      elapsedMs: input.elapsedMs,
      analyzedFileCount: input.analyzedFileCount,
    },
    ...(input.incomplete !== undefined && input.incomplete
      ? {
          incomplete: input.incomplete,
          skippedCheckReasons: input.skippedCheckReasons?.map((r) => ({
            kind: r.kind,
            deadlineMs: r.deadlineMs,
            elapsedMs: r.elapsedMs,
            skippedPasses: [...r.skippedPasses],
          })),
        }
      : {}),
  };
}

export function jsonReport(input: ReporterInput): string {
  return JSON.stringify(buildDoctorReport(input), null, 2);
}
