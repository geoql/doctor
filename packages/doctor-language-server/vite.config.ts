import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite-plus';

const packageRoot = path.dirname(fileURLToPath(import.meta.url));
const { version } = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
) as { version: string };

export default defineConfig({
  pack: {
    entry: ['src/index.ts'],
    format: ['esm'],
    platform: 'node',
    sourcemap: true,
    dts: true,
    env: {
      VERSION: process.env.VERSION ?? version,
    },
    deps: {
      // Keep the heavy engine + LSP transport external so the dist stays
      // lean and runnable standalone via its own node_modules.
      neverBundle: [
        '@geoql/doctor-core',
        'vscode-languageserver',
        'vscode-languageserver-protocol',
        'vscode-languageserver-textdocument',
        'vscode-jsonrpc',
        'vscode-uri',
        /^node:/,
      ],
    },
  },
  lint: {
    plugins: ['typescript', 'import'],
    ignorePatterns: ['dist', 'node_modules', 'coverage', 'tests/fixtures'],
  },
  fmt: {
    printWidth: 100,
    semi: true,
    singleQuote: true,
    tabWidth: 2,
    trailingComma: 'all',
    bracketSpacing: true,
    arrowParens: 'always',
    endOfLine: 'lf',
    ignorePatterns: ['dist', 'node_modules', 'coverage', 'pnpm-lock.yaml'],
  },
});
