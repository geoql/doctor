import { readFile } from 'node:fs/promises';
import type { Diagnostic } from './types.js';

async function readLines(file: string): Promise<string[]> {
  try {
    const content = await readFile(file, 'utf-8');
    return content.split('\n');
  } catch {
    return [];
  }
}

export async function attachCodeSnippets(
  diagnostics: readonly Diagnostic[],
): Promise<Diagnostic[]> {
  const cache = new Map<string, string[]>();
  const out: Diagnostic[] = [];
  for (const d of diagnostics) {
    let lines = cache.get(d.file);
    if (lines === undefined) {
      lines = await readLines(d.file);
      cache.set(d.file, lines);
    }
    const raw = lines[d.line - 1];
    if (raw === undefined) {
      out.push(d);
    } else {
      out.push({ ...d, codeSnippet: raw.trim() });
    }
  }
  return out;
}
