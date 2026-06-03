import { relative } from 'node:path';
import type { Diagnostic } from '../types.js';
import { compareStrings } from './render.js';
import type { ReporterInput } from './types.js';

const DOCS_BASE = 'https://docs.doctor.geoql.in/rules/';
const MAX_PER_SECTION = 5;

function binName(toolName: string): string {
  return toolName.replace('@geoql/', '');
}

function relativeLocation(diag: Diagnostic, rootDirectory: string): string {
  const file = relative(rootDirectory, diag.file).replaceAll('\\', '/');
  return `${file}:${diag.line}`;
}

function findingLine(diag: Diagnostic, rootDirectory: string): string {
  return `- \`${relativeLocation(diag, rootDirectory)}\` ${diag.ruleId} — ${diag.message}`;
}

function sortBySeverityFilter(
  diagnostics: readonly Diagnostic[],
  severity: Diagnostic['severity'],
  rootDirectory: string,
): Diagnostic[] {
  return diagnostics
    .filter((d) => d.severity === severity)
    .sort((a, b) => {
      const byFile = compareStrings(
        relative(rootDirectory, a.file).replaceAll('\\', '/'),
        relative(rootDirectory, b.file).replaceAll('\\', '/'),
      );
      if (byFile !== 0) return byFile;
      if (a.line !== b.line) return a.line - b.line;
      if (a.column !== b.column) return a.column - b.column;
      return compareStrings(a.ruleId, b.ruleId);
    });
}

function section(
  title: string,
  diagnostics: Diagnostic[],
  rootDirectory: string,
): string[] {
  if (diagnostics.length === 0) return [];
  const lines = ['', `### ${title}`];
  for (const d of diagnostics.slice(0, MAX_PER_SECTION)) {
    lines.push(findingLine(d, rootDirectory));
  }
  return lines;
}

export function prCommentReport(input: ReporterInput): string {
  const score = input.score.score;
  const header = `## 🛡 ${input.toolName} — Score: ${score}`;
  const errors = sortBySeverityFilter(
    input.diagnostics,
    'error',
    input.rootDirectory,
  );
  const warnings = sortBySeverityFilter(
    input.diagnostics,
    'warn',
    input.rootDirectory,
  );
  const actionable = errors.length + warnings.length;

  if (actionable === 0) {
    return `${header}\n\n✓ No actionable findings. Score: ${score}\n`;
  }

  const topRule = (errors[0] ?? warnings[0]).ruleId;
  const lines: string[] = [
    header,
    '',
    `**${actionable} findings** (${errors.length} errors, ${warnings.length} warnings)`,
    ...section('Errors', errors, input.rootDirectory),
    ...section('Warnings', warnings, input.rootDirectory),
    '',
    '---',
    `[View the docs](${DOCS_BASE}) · Run \`${binName(input.toolName)} explain ${topRule}\` for details.`,
  ];

  return `${lines.join('\n')}\n`;
}
