/** Display name used in client-facing messages and progress titles. */
export const SERVER_DISPLAY_NAME = 'Doctor';

/** `Diagnostic.source` shown next to every published diagnostic. */
export const DIAGNOSTIC_SOURCE = 'doctor';

/**
 * Debounce window between an open document's last edit and the rescan it
 * triggers. Long enough that fast typing collapses into a single audit,
 * short enough to still feel live. Save scans run with no debounce.
 */
export const DOCUMENT_CHANGE_DEBOUNCE_MS = 400;

/** Delay after `initialized` before the first background workspace scan. */
export const INITIAL_WORKSPACE_SCAN_DELAY_MS = 300;

/**
 * Source file extensions the server scans on open / change / save. Mirrors
 * doctor-core's default include set so editor scanning covers the same
 * files the CLI audits.
 */
export const SCANNABLE_EXTENSIONS = [
  '.vue',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
] as const;
