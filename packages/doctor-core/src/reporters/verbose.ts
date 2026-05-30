import type { AuditReport } from '../types.js';
import type { ConfigSource } from '../config/types.js';

export interface VerboseTraceOptions {
  configSource?: ConfigSource;
}

function formatMs(ms: number): string {
  return `${ms.toFixed(1)}ms`;
}

export function renderVerboseTrace(
  report: AuditReport,
  options: VerboseTraceOptions,
): string {
  const lines: string[] = [];
  lines.push('TIMINGS');
  lines.push(`  template: ${formatMs(report.timings.template)}`);
  lines.push(`  sfc:      ${formatMs(report.timings.sfc)}`);
  lines.push(`  script:   ${formatMs(report.timings.script)}`);
  lines.push(`  deadCode: ${formatMs(report.timings.deadCode)}`);
  lines.push(`  total:   ${formatMs(report.timings.total)}`);

  const ruleKeys = Object.keys(report.ruleCounts);
  if (ruleKeys.length > 0) {
    lines.push('RULE COUNTS');
    for (const ruleId of ruleKeys.sort()) {
      lines.push(`  ${ruleId}: ${report.ruleCounts[ruleId]}`);
    }
  }

  if (options.configSource) {
    lines.push('CONFIG');
    lines.push(`  source: ${options.configSource}`);
  }

  return lines.join('\n');
}
