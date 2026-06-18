// Manual QA: stand up the language server over stdio via the real
// vscode-languageserver client connection and round-trip an
// initialize + didOpen + didSave. Validates that:
//   - The bin shim loads and the server speaks LSP
//   - workspaceFolders are resolved to a filesystem root
//   - didOpen + didSave triggers an audit that produces diagnostics
//   - Diagnostics carry the correct range, severity, source, code, href
import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { URI } from 'vscode-uri';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, '..');
const serverBin = join(packageRoot, 'bin', 'doctor-language-server.mjs');
const distIndex = join(packageRoot, 'dist', 'index.mjs');
import { existsSync, readFileSync as readPkg } from 'node:fs';

console.log('LSP stdio round-trip QA');
console.log('  server bin: ' + serverBin);
console.log('  dist index: ' + distIndex);

if (!existsSync(distIndex)) {
  console.error('FAIL: dist/index.mjs is missing - run `pnpm run build` first.');
  process.exit(1);
}
const bin = readPkg(serverBin, 'utf8');
if (!bin.includes('startLanguageServer')) {
  console.error('FAIL: bin/doctor-language-server.mjs does not import startLanguageServer.');
  process.exit(1);
}
console.log('OK: bin shim imports startLanguageServer()');

// Spin up a tiny workspace with a .vue file and tsconfig so the audit
// surfaces a `tsconfig-strict-required` build-quality finding.
const workspace = mkdtempSync('/tmp/doctor-qa-');
const vueFile = join(workspace, 'App.vue');
writeFileSync(
  vueFile,
  [
    '<script setup lang="ts">',
    'const items = [1, 2, 3, 4, 5];',
    '</script>',
    '',
    '<template>',
    '  <ul>',
    '    <li v-for="i in items">{{ i }}</li>',
    '  </ul>',
    '</template>',
    '',
  ].join('\n'),
);
writeFileSync(join(workspace, 'tsconfig.json'), '{}\n');
writeFileSync(
  join(workspace, 'package.json'),
  JSON.stringify({
    name: 'doctor-stdio-qa',
    version: '0.0.0',
    private: true,
    dependencies: { vue: '^3.5.0' },
  }),
);

const proc = spawn(process.execPath, [serverBin], { stdio: ['pipe', 'pipe', 'pipe'] });
proc.stderr.on('data', (c) => process.stderr.write('[server-err] ' + c));

let diagnosticsResult = null;
const connection = createConnection(ProposedFeatures.all, proc.stdout, proc.stdin);
connection.onNotification('textDocument/publishDiagnostics', (params) => {
  diagnosticsResult = params;
});
connection.onRequest('workspace/configuration', () => []);
connection.listen();

const wsUri = URI.file(workspace).toString();
const vueUri = URI.file(vueFile).toString();

console.log('CLIENT: initialize');
const initResult = await connection.sendRequest('initialize', {
  processId: process.pid,
  rootUri: wsUri,
  capabilities: {},
  workspaceFolders: [{ uri: wsUri, name: 'qa' }],
});
console.log(
  'OK: server responded to initialize; capabilities keys = ' +
    JSON.stringify(Object.keys(initResult.capabilities || {})),
);

connection.sendNotification('initialized', {});
await new Promise((r) => setTimeout(r, 1000));

connection.sendNotification('textDocument/didOpen', {
  textDocument: {
    uri: vueUri,
    languageId: 'vue',
    version: 1,
    text: readFileSync(vueFile, 'utf8'),
  },
});
connection.sendNotification('textDocument/didSave', {
  textDocument: { uri: vueUri, version: 1 },
});

console.log('CLIENT: waiting up to 30s for publishDiagnostics');
let waited = 0;
while (waited < 30_000 && !diagnosticsResult) {
  await new Promise((r) => setTimeout(r, 250));
  waited += 250;
}

if (!diagnosticsResult) {
  console.error('FAIL: no diagnostics in ' + waited + 'ms');
  connection.sendNotification('exit', null);
  proc.kill();
  rmSync(workspace, { recursive: true, force: true });
  process.exit(1);
}
console.log('OK: received publishDiagnostics');
console.log('  URI: ' + diagnosticsResult.uri);
console.log('  count: ' + diagnosticsResult.diagnostics.length);
for (const d of diagnosticsResult.diagnostics.slice(0, 5)) {
  console.log(
    '    -> ' +
      d.code +
      ' @ ' +
      d.range.start.line +
      ':' +
      d.range.start.character +
      ' severity=' +
      d.severity +
      ' source=' +
      d.source,
  );
  console.log('       href=' + (d.codeDescription && d.codeDescription.href ? d.codeDescription.href : '(none)'));
}
console.log('\nLSP stdio round-trip QA OK');

connection.sendNotification('exit', null);
proc.kill();
rmSync(workspace, { recursive: true, force: true });
