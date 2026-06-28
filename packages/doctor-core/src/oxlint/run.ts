import type { Diagnostic, Severity } from '../types.js';
import { toCanonicalDiagnostics } from './diagnostic.js';
import { generateOxlintConfig } from './generate-config.js';
import {
  resolveNuxtDoctorPluginPath,
  resolveOxlintBin,
  resolveVueDoctorPluginPath,
} from './resolve-plugin.js';
import { runOxlint } from './spawn.js';

export interface ScriptPassOptions {
  rootDir: string;
  targetPath: string;
  ruleOverrides?: Record<string, Severity | 'off'>;
  timeoutMs?: number;
  framework?: 'vue' | 'nuxt';
  fix?: boolean;
  fixExcludes?: string[];
  exclude?: string[];
}

export interface ScriptPassResult {
  diagnostics: Diagnostic[];
  stderr: string;
  exitCode: number | null;
}

export async function runScriptPass(
  opts: ScriptPassOptions,
): Promise<ScriptPassResult> {
  const vuePluginPath = resolveVueDoctorPluginPath(opts.rootDir);
  const oxlintBin = resolveOxlintBin(opts.rootDir);
  let pluginPaths: string[];
  if (opts.framework === 'nuxt') {
    const nuxtPluginPath = resolveNuxtDoctorPluginPath(opts.rootDir);
    pluginPaths = [nuxtPluginPath, vuePluginPath];
  } else {
    pluginPaths = [vuePluginPath];
  }
  const { configPath, cleanup } = await generateOxlintConfig({
    pluginPaths,
    ruleOverrides: opts.ruleOverrides,
    rootDir: opts.rootDir,
    framework: opts.framework,
    exclude: opts.exclude,
  });
  try {
    const raw = await runOxlint({
      rootDir: opts.rootDir,
      targetPath: opts.targetPath,
      configPath,
      oxlintBin,
      timeoutMs: opts.timeoutMs,
      fix: opts.fix,
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
