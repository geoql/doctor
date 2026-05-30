import { spawn } from 'node:child_process';
import { OxlintOutputTooLarge, OxlintSpawnFailed } from './errors.js';
import type {
  OxlintRawDiagnostic,
  OxlintRunOptions,
  OxlintRunResult,
} from './types.js';

export const OXLINT_SPAWN_TIMEOUT_MS = 60_000;
export const OXLINT_MAX_OUTPUT_BYTES = 32 * 1024 * 1024;

interface OxlintJsonReport {
  diagnostics?: OxlintRawDiagnostic[];
}

function sanitizedEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.NODE_OPTIONS;
  for (const key of Object.keys(env)) {
    if (key.startsWith('npm_config_')) delete env[key];
  }
  return env;
}

export async function runOxlint(
  opts: OxlintRunOptions,
): Promise<OxlintRunResult> {
  return new Promise<OxlintRunResult>((resolve, reject) => {
    const args = ['-c', opts.configPath, '--format', 'json', opts.targetPath];
    const child = spawn(opts.oxlintBin, args, {
      cwd: opts.rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: sanitizedEnv(),
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let stdoutBytes = 0;
    let settled = false;
    let timer: NodeJS.Timeout | undefined;
    const timeoutMs = opts.timeoutMs ?? OXLINT_SPAWN_TIMEOUT_MS;
    const maxOutputBytes = opts.maxOutputBytes ?? OXLINT_MAX_OUTPUT_BYTES;
    const finish = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      fn();
    };
    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        child.kill('SIGKILL');
        finish(() =>
          reject(new Error(`oxlint subprocess timed out after ${timeoutMs}ms`)),
        );
      }, timeoutMs);
    }
    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > maxOutputBytes) {
        child.kill('SIGKILL');
        finish(() => reject(new OxlintOutputTooLarge(maxOutputBytes)));
        return;
      }
      stdoutChunks.push(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));
    child.on('error', (err) => {
      finish(() => reject(err));
    });
    child.on('close', (exitCode) => {
      finish(() => {
        const stdout = Buffer.concat(stdoutChunks).toString('utf8');
        const stderr = Buffer.concat(stderrChunks).toString('utf8');
        const diagnostics = parseOxlintJsonStream(stdout);
        if (exitCode !== 0 && exitCode !== null && diagnostics.length === 0) {
          reject(new OxlintSpawnFailed(exitCode, stderr));
          return;
        }
        resolve({ diagnostics, stderr, exitCode });
      });
    });
  });
}

function parseOxlintJsonStream(stdout: string): OxlintRawDiagnostic[] {
  const trimmed = stdout.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed) as
      | OxlintJsonReport
      | OxlintRawDiagnostic[];
    if (Array.isArray(parsed)) return parsed;
    if (parsed.diagnostics) return parsed.diagnostics;
  } catch {
    return parseNdjson(trimmed);
  }
  return [];
}

function parseNdjson(text: string): OxlintRawDiagnostic[] {
  const out: OxlintRawDiagnostic[] = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try {
      const obj = JSON.parse(t) as OxlintRawDiagnostic;
      if (obj && typeof obj === 'object' && 'message' in obj) out.push(obj);
    } catch {
      // skip non-json line
    }
  }
  return out;
}
