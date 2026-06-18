import { isAbsolute, resolve } from 'node:path';
import { URI } from 'vscode-uri';

/**
 * Resolves a doctor-core diagnostic's `file` (relative to the audit root, or
 * already absolute) to a `file://` URI the editor can address. Paths are
 * normalized to forward slashes by `vscode-uri`, so casing/encoding stay
 * consistent across platforms.
 */
export const diagnosticFileToUri = (rootDir: string, file: string): string => {
  const absolute = isAbsolute(file) ? file : resolve(rootDir, file);
  return URI.file(absolute).toString();
};

/** Converts a `file://` URI back to an absolute fs path. */
export const uriToFsPath = (uri: string): string => URI.parse(uri).fsPath;
