import { spawn } from 'node:child_process';
import type {
  OxlintRawDiagnostic,
  OxlintRunOptions,
  OxlintRunResult,
} from './types.js';

const DEFAULT_TIMEOUT_MS = 60_000;

interface OxlintJsonReport {
  diagnostics?: OxlintRawDiagnostic[];
}

export async function runOxlint(
  opts: OxlintRunOptions,
): Promise<OxlintRunResult> {
  return new Promise<OxlintRunResult>((resolve, reject) => {
    const args = ['-c', opts.configPath, '--format', 'json', opts.targetPath];
    const child = spawn(opts.oxlintBin, args, {
      cwd: opts.rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let timer: NodeJS.Timeout | undefined;
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`oxlint subprocess timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }
    child.stdout.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => stderrChunks.push(chunk));
    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      reject(err);
    });
    child.on('close', (exitCode) => {
      if (timer) clearTimeout(timer);
      const stdout = Buffer.concat(stdoutChunks).toString('utf8');
      const stderr = Buffer.concat(stderrChunks).toString('utf8');
      const diagnostics = parseOxlintJsonStream(stdout);
      resolve({ diagnostics, stderr, exitCode });
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
