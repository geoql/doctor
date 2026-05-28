import { relative } from 'node:path';
import * as c from 'kolorist';
import type { AuditReport } from '../types.js';

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
      const sev = d.severity === 'error' ? c.red('error') : c.yellow('warning');
      const loc = c.dim(`${d.line}:${d.column}`);
      const rule = c.dim(`(${d.ruleId})`);
      lines.push(`  ${loc}  ${sev}  ${d.message} ${rule}`);
      if (d.recommendation)
        lines.push(`        ${c.dim('hint:')} ${d.recommendation}`);
    }
    lines.push('');
  }
  const summary = `${report.errorCount} error${report.errorCount === 1 ? '' : 's'}, ${report.warningCount} warning${report.warningCount === 1 ? '' : 's'} in ${report.filesScanned} file${report.filesScanned === 1 ? '' : 's'}`;
  const scoreLine = `Score: ${c.bold(String(report.score))}/100`;
  lines.push(summary);
  lines.push(scoreLine);
  return lines.join('\n');
}
