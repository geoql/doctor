import { docsUrl } from './docs-url.js';
import type { ReporterInput } from './types.js';
import type { Diagnostic, Severity } from '../types.js';

const SEVERITY_LABEL: Record<Severity, string> = {
  error: 'Error',
  warn: 'Warn',
  info: 'Info',
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function relativize(file: string, rootDir: string): string {
  return file.startsWith(`${rootDir}/`) ? file.slice(rootDir.length + 1) : file;
}

function renderDiagnosticRow(d: Diagnostic, rootDir: string): string {
  const loc = `${escapeHtml(relativize(d.file, rootDir))}:${d.line}:${d.column}`;
  const recommendation = d.recommendation
    ? `<div class="rec"><strong>Fix:</strong> ${escapeHtml(d.recommendation)}</div>`
    : '';
  return [
    `<details class="finding sev-${d.severity}">`,
    `  <summary>`,
    `    <span class="sev">${SEVERITY_LABEL[d.severity]}</span>`,
    `    <code class="rule">${escapeHtml(d.ruleId)}</code>`,
    `    <span class="loc">${loc}</span>`,
    `    <span class="msg">${escapeHtml(d.message)}</span>`,
    `  </summary>`,
    `  <div class="body">`,
    recommendation,
    `    <div class="docs"><a href="${escapeHtml(docsUrl(d.ruleId))}" target="_blank" rel="noopener">Rule docs</a></div>`,
    `  </div>`,
    `</details>`,
  ].join('\n');
}

const STYLES = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font: 14px/1.5 system-ui, -apple-system, sans-serif; background: #0f0f0f; color: #e5e5e5; padding: 2rem; }
header { border-bottom: 1px solid #2a2a2a; padding-bottom: 1.5rem; margin-bottom: 1.5rem; }
h1 { font-size: 1.25rem; font-weight: 500; color: #fafafa; }
.meta { color: #888; margin-top: 0.5rem; font-size: 0.85rem; }
.score-row { display: flex; gap: 2rem; margin-top: 1rem; align-items: baseline; }
.score-row .score { font-size: 3rem; font-weight: 200; color: #fafafa; }
.score-row .score.pass { color: #4ade80; }
.score-row .score.fail { color: #f87171; }
.score-row .breakdown { color: #aaa; font-size: 0.9rem; }
.finding { border: 1px solid #2a2a2a; border-radius: 6px; margin-bottom: 0.5rem; background: #1a1a1a; overflow: hidden; }
.finding summary { padding: 0.75rem 1rem; cursor: pointer; display: grid; grid-template-columns: 4rem 14rem 14rem 1fr; gap: 0.75rem; align-items: baseline; font-size: 0.85rem; list-style: none; }
.finding summary::-webkit-details-marker { display: none; }
.sev { font-size: 0.7rem; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; }
.sev-error .sev { color: #f87171; }
.sev-warn .sev { color: #fbbf24; }
.sev-info .sev { color: #60a5fa; }
.rule { color: #aaa; font-family: ui-monospace, monospace; font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.loc { color: #888; font-family: ui-monospace, monospace; font-size: 0.8rem; }
.msg { color: #d4d4d4; }
.body { padding: 0 1rem 1rem; border-top: 1px solid #2a2a2a; color: #ccc; font-size: 0.85rem; }
.rec { margin-top: 0.75rem; }
.docs { margin-top: 0.5rem; }
.docs a { color: #60a5fa; text-decoration: none; }
.docs a:hover { text-decoration: underline; }
.empty { color: #888; padding: 2rem 0; text-align: center; }
`;

export function htmlReport(input: ReporterInput): string {
  const score = input.score.score;
  const pass = input.score.passed;
  const rows = input.diagnostics
    .map((d) => renderDiagnosticRow(d, input.rootDirectory))
    .join('\n');
  const body =
    input.diagnostics.length === 0
      ? `<p class="empty">No findings. Clean run.</p>`
      : rows;
  const findingsLabel = `${input.diagnostics.length} finding${input.diagnostics.length === 1 ? '' : 's'}`;
  const meta = `${input.toolName} v${input.toolVersion} · ${input.analyzedFileCount} file${input.analyzedFileCount === 1 ? '' : 's'} · ${input.elapsedMs.toFixed(0)}ms`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(input.toolName)} — Report</title>
<style>${STYLES}</style>
</head>
<body>
<header>
  <h1>${escapeHtml(input.toolName)} report</h1>
  <div class="meta">${escapeHtml(meta)} · ${escapeHtml(input.rootDirectory)}</div>
  <div class="score-row">
    <div class="score ${pass ? 'pass' : 'fail'}">${score}<span style="font-size:1.5rem;color:#888">/100</span></div>
    <div class="breakdown">${findingsLabel} · ${input.score.errorCount} error · ${input.score.warnCount} warn · ${input.score.infoCount} info</div>
  </div>
</header>
<main>
${body}
</main>
</body>
</html>
`;
}
