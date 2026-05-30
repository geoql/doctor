import type { Diagnostic, Severity } from '../types.js';
import { toCanonicalDiagnostics } from './diagnostic.js';
import { generateOxlintConfig } from './generate-config.js';
import {
  resolveOxlintBin,
  resolveVueDoctorPluginPath,
} from './resolve-plugin.js';
import { runOxlint } from './spawn.js';

export interface ScriptPassOptions {
  rootDir: string;
  targetPath: string;
  ruleOverrides?: Record<string, Severity | 'off'>;
  timeoutMs?: number;
}

export interface ScriptPassResult {
  diagnostics: Diagnostic[];
  stderr: string;
  exitCode: number | null;
}

export async function runScriptPass(
  opts: ScriptPassOptions,
): Promise<ScriptPassResult> {
  const pluginPath = resolveVueDoctorPluginPath(opts.rootDir);
  const oxlintBin = resolveOxlintBin(opts.rootDir);
  const { configPath, cleanup } = await generateOxlintConfig({
    pluginPath,
    ruleOverrides: opts.ruleOverrides,
    rootDir: opts.rootDir,
  });
  try {
    const raw = await runOxlint({
      rootDir: opts.rootDir,
      targetPath: opts.targetPath,
      configPath,
      oxlintBin,
      timeoutMs: opts.timeoutMs,
    });
    return {
      diagnostics: toCanonicalDiagnostics(raw.diagnostics, opts.rootDir),
      stderr: raw.stderr,
      exitCode: raw.exitCode,
    };
  } finally {
    await cleanup();
  }
}
