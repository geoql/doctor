import { relative } from 'node:path';
import * as c from 'kolorist';
import type { AuditReport } from '../types.js';

function formatSeverity(severity: string): string {
  if (severity === 'error') return c.red('error');
  if (severity === 'warn') return c.yellow('warn');
  return c.cyan('info');
}

function pluralize(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

export function formatText(report: AuditReport): string {
  const lines: string[] = [];
  const groups = new Map<string, AuditReport['diagnostics']>();
  for (const d of report.diagnostics) {
    const arr = groups.get(d.file) ?? [];
    arr.push(d);
    groups.set(d.file, arr);
  }
  for (const [file, diags] of groups) {
    const rel = relative(report.rootDir, file) || file;
    lines.push(c.underline(c.bold(rel)));
    for (const d of diags) {
      const sev = formatSeverity(d.severity);
      const loc = c.dim(`${d.line}:${d.column}`);
      const rule = c.dim(`(${d.ruleId})`);
      lines.push(`  ${loc}  ${sev}  ${d.message} ${rule}`);
      if (d.recommendation)
        lines.push(`        ${c.dim('hint:')} ${d.recommendation}`);
    }
    lines.push('');
  }
  const parts: string[] = [];
  if (report.errorCount > 0) parts.push(pluralize(report.errorCount, 'error'));
  if (report.warnCount > 0) parts.push(pluralize(report.warnCount, 'warning'));
  if (report.infoCount > 0) parts.push(pluralize(report.infoCount, 'info'));
  if (parts.length === 0) parts.push('0 errors, 0 warnings, 0 infos');
  const summary = `${parts.join(', ')} in ${report.filesScanned} file${report.filesScanned === 1 ? '' : 's'}`;
  const scoreLine = `Score: ${c.bold(String(report.score))}/100`;
  lines.push(summary);
  lines.push(scoreLine);
  return lines.join('\n');
}
