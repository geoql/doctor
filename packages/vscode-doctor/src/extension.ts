import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  LanguageClient,
  TransportKind,
  type Executable,
  type LanguageClientOptions,
  type ServerOptions,
} from 'vscode-languageclient/node';

const CLIENT_ID = 'doctor';
const CLIENT_NAME = 'Doctor';
const COMMAND_RESTART = 'doctor.restart';
const COMMAND_SHOW_OUTPUT = 'doctor.showOutput';
const BIN_NAME = 'doctor-language-server';
const IS_WINDOWS = process.platform === 'win32';

const DOCUMENT_LANGUAGE_IDS = [
  'vue',
  'typescript',
  'typescriptreact',
  'javascript',
  'javascriptreact',
] as const;

let client: LanguageClient | undefined;

interface ResolvedServer {
  readonly command: string;
  readonly args: string[];
  readonly shell: boolean;
}

/**
 * Resolves how to launch the doctor language server, preferring the
 * project's own install so the editor uses the version pinned in the repo,
 * then falling back to `npx` so the extension works with zero setup:
 *   1. `doctor.serverPath` setting (explicit override)
 *   2. workspace `node_modules/.bin/doctor-language-server`
 *   3. `npx @geoql/doctor-language-server@latest`
 */
const resolveServer = (
  configuration: vscode.WorkspaceConfiguration,
): ResolvedServer => {
  const explicitPath = configuration.get<string>('serverPath', '').trim();
  if (explicitPath.length > 0) {
    return { command: explicitPath, args: ['--stdio'], shell: false };
  }

  const binName = IS_WINDOWS ? `${BIN_NAME}.cmd` : BIN_NAME;
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const localBin = path.join(
      folder.uri.fsPath,
      'node_modules',
      '.bin',
      binName,
    );
    if (fs.existsSync(localBin)) {
      return { command: localBin, args: ['--stdio'], shell: IS_WINDOWS };
    }
  }

  return {
    command: IS_WINDOWS ? 'npx.cmd' : 'npx',
    args: ['-y', '@geoql/doctor-language-server@latest', '--stdio'],
    shell: IS_WINDOWS,
  };
};

export const activate = async (
  context: vscode.ExtensionContext,
): Promise<void> => {
  const configuration = vscode.workspace.getConfiguration(CLIENT_ID);
  if (!configuration.get<boolean>('enable', true)) return;

  const outputChannel = vscode.window.createOutputChannel(CLIENT_NAME);
  const resolved = resolveServer(configuration);
  const executable: Executable = {
    command: resolved.command,
    args: resolved.args,
    transport: TransportKind.stdio,
    options: { shell: resolved.shell },
  };
  const serverOptions: ServerOptions = { run: executable, debug: executable };

  const clientOptions: LanguageClientOptions = {
    documentSelector: DOCUMENT_LANGUAGE_IDS.map((language) => ({
      scheme: 'file',
      language,
    })),
    outputChannel,
    traceOutputChannel: outputChannel,
  };

  const languageClient = new LanguageClient(
    CLIENT_ID,
    CLIENT_NAME,
    serverOptions,
    clientOptions,
  );
  client = languageClient;

  context.subscriptions.push(
    outputChannel,
    languageClient,
    vscode.commands.registerCommand(COMMAND_SHOW_OUTPUT, () =>
      outputChannel.show(),
    ),
    vscode.commands.registerCommand(COMMAND_RESTART, () =>
      languageClient.restart(),
    ),
  );

  try {
    await languageClient.start();
  } catch (error) {
    outputChannel.appendLine(
      `Failed to start the Doctor language server: ${error instanceof Error ? error.message : String(error)}`,
    );
    void vscode.window.showErrorMessage(
      `${CLIENT_NAME}: failed to start. Ensure Node.js is installed and "@geoql/doctor-language-server" is available (npm i -D @geoql/doctor-language-server).`,
    );
  }
};

export const deactivate = (): Thenable<void> | undefined => client?.stop();
