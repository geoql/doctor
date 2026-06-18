import { audit, docsUrl } from '@geoql/doctor-core';
import {
  groupDiagnosticsByUri,
  toLspDiagnostic,
  toLspSeverity,
} from '../dist/index.mjs';

const target = process.argv[2] ?? process.cwd();
console.log('Auditing ' + target + '...');

const report = await audit({ rootDir: target, deadCode: false, lint: true });
console.log(
  'audit() -> ' +
    report.diagnostics.length +
    ' diagnostics, score=' +
    report.score +
    ' (errors=' +
    report.errorCount +
    ', warnings=' +
    report.warnCount +
    ', info=' +
    report.infoCount +
    ')',
);

if (report.diagnostics.length === 0) {
  console.log('No diagnostics to map. (Try a directory with a violating .vue file.)');
  process.exit(0);
}

let mapped = 0;
let firstSample = null;
for (const diagnostic of report.diagnostics) {
  const lsp = toLspDiagnostic({ diagnostic, text: null });
  mapped += 1;
  if (firstSample === null) firstSample = { diagnostic, lsp };

  if (lsp.range.start.line !== diagnostic.line - 1) {
    console.error('FAIL: line 1->0 mapping for ' + diagnostic.ruleId);
    process.exit(1);
  }
  if (lsp.range.start.character !== diagnostic.column - 1) {
    console.error('FAIL: column 1->0 mapping for ' + diagnostic.ruleId);
    process.exit(1);
  }
  if (lsp.code !== diagnostic.ruleId) {
    console.error('FAIL: code !== ruleId for ' + diagnostic.ruleId);
    process.exit(1);
  }
  if (lsp.source !== 'doctor') {
    console.error('FAIL: source !== doctor for ' + diagnostic.ruleId);
    process.exit(1);
  }
  if (lsp.codeDescription?.href !== docsUrl(diagnostic.ruleId)) {
    console.error('FAIL: codeDescription.href for ' + diagnostic.ruleId);
    process.exit(1);
  }
  if (lsp.severity !== toLspSeverity(diagnostic.severity)) {
    console.error('FAIL: severity mapping for ' + diagnostic.ruleId);
    process.exit(1);
  }
}

console.log('OK: ' + mapped + ' diagnostics mapped cleanly through toLspDiagnostic');

const subset = report.diagnostics.slice(0, 5);
const byUri = groupDiagnosticsByUri({
  report: { ...report, diagnostics: subset },
  textForFile: () => null,
});
console.log(
  'OK: groupDiagnosticsByUri -> ' + byUri.size + ' unique URIs across first 5 diagnostics',
);

if (firstSample) {
  const diagnostic = firstSample.diagnostic;
  const lsp = firstSample.lsp;
  console.log('\nFirst diagnostic sample:');
  console.log('  ruleId    : ' + diagnostic.ruleId);
  console.log('  severity  : ' + diagnostic.severity + ' -> LSP ' + lsp.severity);
  console.log(
    '  range     : ' +
      diagnostic.line +
      ':' +
      diagnostic.column +
      ' -> ' +
      lsp.range.start.line +
      ':' +
      lsp.range.start.character,
  );
  console.log('  code      : ' + lsp.code);
  console.log('  source    : ' + lsp.source);
  console.log('  href      : ' + lsp.codeDescription?.href);
  console.log('  message   : ' + lsp.message);
}

console.log('\nQA OK');
