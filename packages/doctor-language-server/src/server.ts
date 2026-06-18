import { readFileSync } from 'node:fs';
import { audit, detectProject } from '@geoql/doctor-core';
import {
  TextDocuments,
  TextDocumentSyncKind,
  createConnection,
  type Connection,
  type InitializeParams,
  type InitializeResult,
  type ServerCapabilities,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  DOCUMENT_CHANGE_DEBOUNCE_MS,
  INITIAL_WORKSPACE_SCAN_DELAY_MS,
  SERVER_DISPLAY_NAME,
} from './constants.js';
import { createVersionCache } from './cache.js';
import { groupDiagnosticsByUri } from './group.js';
import { isAuditableProject } from './selection.js';
import { createScheduler } from './scheduler.js';
import { uriToFsPath } from './uri.js';

const SERVER_VERSION = process.env.VERSION ?? '0.0.0-dev';

/**
 * Builds and wires the Doctor language server onto a connection. Exposed
 * separately from {@link startLanguageServer} so the I/O shell stays thin and
 * the pure transforms (mapper, positions, severity, group, scheduler, cache,
 * selection) carry the behavior — and the coverage.
 */
export const createServer = (connection: Connection): void => {
  const documents = new TextDocuments(TextDocument);
  const versionCache = createVersionCache();
  let workspaceRoot: string | null = null;

  // URIs that currently hold published diagnostics, so a clean re-audit can
  // clear stale squiggles instead of leaving them behind.
  const publishedUris = new Set<string>();

  const readText = (fsPath: string): string | null => {
    const fileUri = `file://${fsPath}`;
    const open = documents.get(fileUri);
    if (open) return open.getText();
    try {
      return readFileSync(fsPath, 'utf8');
    } catch {
      return null;
    }
  };

  const runAudit = async (
    rootDir: string,
    scopeFsPath: string | null,
  ): Promise<void> => {
    const project = await detectProject(rootDir);
    if (!isAuditableProject(project)) return;

    const report = await audit({
      rootDir,
      ...(scopeFsPath !== null ? { scopeFiles: [scopeFsPath] } : {}),
    });

    const byUri = groupDiagnosticsByUri({
      report,
      textForFile: (file) =>
        readText(file.startsWith('/') ? file : `${rootDir}/${file}`),
      previousUris: publishedUris,
    });

    for (const [uri, diagnostics] of byUri) {
      connection.sendDiagnostics({ uri, diagnostics });
      if (diagnostics.length > 0) publishedUris.add(uri);
      else publishedUris.delete(uri);
    }
  };

  const scheduler = createScheduler({
    debounceMs: DOCUMENT_CHANGE_DEBOUNCE_MS,
    performScan: async (key) => {
      if (workspaceRoot === null) return;
      const scope = key === workspaceRoot ? null : uriToFsPath(key);
      await runAudit(workspaceRoot, scope);
    },
    onError: (error, key) =>
      connection.console.error(
        `Audit of ${key} failed: ${error instanceof Error ? error.message : String(error)}`,
      ),
  });

  connection.onInitialize((params: InitializeParams): InitializeResult => {
    workspaceRoot = resolveWorkspaceRoot(params);
    const capabilities: ServerCapabilities = {
      textDocumentSync: {
        openClose: true,
        change: TextDocumentSyncKind.Incremental,
        save: { includeText: false },
      },
    };
    return {
      capabilities,
      serverInfo: { name: SERVER_DISPLAY_NAME, version: SERVER_VERSION },
    };
  });

  connection.onInitialized(() => {
    if (workspaceRoot !== null) {
      const root = workspaceRoot;
      setTimeout(
        () => scheduler.enqueue(root, INITIAL_WORKSPACE_SCAN_DELAY_MS),
        0,
      );
    }
  });

  // Open + save audit the touched file (save with no debounce); per-keystroke
  // edits ride the version cache + debounce so a burst collapses to one run.
  documents.onDidOpen((event) => {
    if (versionCache.shouldAudit(event.document.uri, event.document.version)) {
      versionCache.markAudited(event.document.uri, event.document.version);
      scheduler.enqueue(event.document.uri);
    }
  });

  documents.onDidChangeContent((event) => {
    if (versionCache.shouldAudit(event.document.uri, event.document.version)) {
      versionCache.markAudited(event.document.uri, event.document.version);
      scheduler.enqueue(event.document.uri);
    }
  });

  documents.onDidSave((event) => {
    scheduler.enqueue(event.document.uri, 0);
  });

  documents.onDidClose((event) => {
    versionCache.forget(event.document.uri);
    scheduler.cancel(event.document.uri);
  });

  connection.onShutdown(() => {
    scheduler.dispose();
  });

  documents.listen(connection);
  connection.listen();
};

const resolveWorkspaceRoot = (params: InitializeParams): string | null => {
  if (params.workspaceFolders && params.workspaceFolders.length > 0) {
    return uriToFsPath(params.workspaceFolders[0].uri);
  }
  if (params.rootUri) return uriToFsPath(params.rootUri);
  if (params.rootPath) return params.rootPath;
  return null;
};

/**
 * stdout is the LSP message channel — any stray write corrupts the protocol
 * stream. Route accidental `console.log` / `info` / `debug` to stderr.
 */
const protectStdoutChannel = (): void => {
  const toStderr = (...args: unknown[]): void => {
    process.stderr.write(`${args.map((arg) => String(arg)).join(' ')}\n`);
  };
  console.log = toStderr;
  console.info = toStderr;
  console.debug = toStderr;
};

/** Entry point: starts the server over stdio. */
export const startLanguageServer = (): void => {
  protectStdoutChannel();
  const connection = createConnection(process.stdin, process.stdout);
  createServer(connection);
};
