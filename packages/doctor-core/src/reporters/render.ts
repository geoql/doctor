import { relative } from 'node:path';
import type { ScoreBreakdownEntry, ScoreResult } from '../score.js';
import type { Diagnostic, Severity } from '../types.js';
import { docsUrl } from './docs-url.js';
import type { ReporterInput, ReporterOptions } from './types.js';

const CODE_WIDTH = 80;
const WHY_WIDTH = 70;
const SEVERITY_WIDTH = 6;
const CONTINUATION_INDENT = ' '.repeat(10);

export interface Theme {
  severity: (severity: Severity) => string;
  scoreValue: (score: number) => string;
}

function relativize(file: string, rootDirectory: string): string {
  return relative(rootDirectory, file).replaceAll('\\', '/');
}

export function compareStrings(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function truncateCode(code: string): string {
  if (code.length <= CODE_WIDTH) return code;
  return `${code.slice(0, CODE_WIDTH - 1)}…`;
}

function wrapText(text: string, width: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current === '') {
      current = word;
    } else if (`${current} ${word}`.length <= width) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current !== '') lines.push(current);
  return lines;
}

function formatWhy(message: string): string {
  return wrapText(message, WHY_WIDTH).join(`\n${CONTINUATION_INDENT}`);
}

function severityTag(severity: Severity, theme: Theme): string {
  const padding = ' '.repeat(SEVERITY_WIDTH - severity.length);
  return `${theme.severity(severity)}${padding}`;
}

function sortDiagnostics(
  diagnostics: readonly Diagnostic[],
  rootDirectory: string,
): Diagnostic[] {
  return [...diagnostics].sort((a, b) => {
    const byFile = compareStrings(
      relativize(a.file, rootDirectory),
      relativize(b.file, rootDirectory),
    );
    if (byFile !== 0) return byFile;
    if (a.line !== b.line) return a.line - b.line;
    if (a.column !== b.column) return a.column - b.column;
    return compareStrings(a.ruleId, b.ruleId);
  });
}

function diagnosticBlock(
  index: number,
  diagnostic: Diagnostic,
  rootDirectory: string,
  theme: Theme,
): string {
  const tag = severityTag(diagnostic.severity, theme);
  const location = `${relativize(diagnostic.file, rootDirectory)}:${diagnostic.line}:${diagnostic.column}`;
  const code = truncateCode(diagnostic.codeSnippet ?? '');
  const fix = diagnostic.recommendation ?? '(no automated fix)';
  const why = formatWhy(diagnostic.message);
  return [
    `[${index}] ${tag} ${diagnostic.ruleId}`,
    `    file: ${location}`,
    `    code: ${code}`,
    `    fix:  ${fix}`,
    `    why:  ${why}`,
    `    docs: ${docsUrl(diagnostic.ruleId)}`,
  ].join('\n');
}

function findingsLine(score: ScoreResult): string {
  if (score.totalFindings === 0) return 'FINDINGS: 0 (clean)';
  return `FINDINGS: ${score.totalFindings} (${score.errorCount} error, ${score.warnCount} warn, ${score.infoCount} info)`;
}

function nextSteps(breakdown: readonly ScoreBreakdownEntry[]): string {
  const top = breakdown.slice(0, 3);
  const lines = top.map(
    (entry) =>
      `  −${Math.round(entry.penalty)} pts  ${entry.occurrences}× ${entry.ruleId}`,
  );
  lines.push(
    `  Run \`vue-doctor explain ${breakdown[0]!.ruleId}\` for full context.`,
  );
  return ['NEXT STEPS:', ...lines].join('\n');
}

export function render(
  input: ReporterInput,
  options: ReporterOptions | undefined,
  theme: Theme,
): string {
  const seconds = (input.elapsedMs / 1000).toFixed(1);
  const segments: string[] = [
    `${input.toolName} v${input.toolVersion}`,
    `analyzed ${input.analyzedFileCount} files in ${seconds}s`,
    '',
    `SCORE: ${theme.scoreValue(input.score.score)}/100 (threshold: ${input.score.threshold})`,
    '',
    findingsLine(input.score),
  ];

  const sorted = sortDiagnostics(input.diagnostics, input.rootDirectory);
  sorted.forEach((diagnostic, i) => {
    segments.push('');
    segments.push(
      diagnosticBlock(i + 1, diagnostic, input.rootDirectory, theme),
    );
  });

  if (!options?.quiet && input.score.breakdown.length > 0) {
    segments.push('');
    segments.push(nextSteps(input.score.breakdown));
  }

  return `${segments.join('\n')}\n`;
}
