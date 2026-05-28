import { readFile } from 'node:fs/promises';
import { parse, type SFCDescriptor } from '@vue/compiler-sfc';

const cache = new Map<string, SFCDescriptor | null>();

export async function parseSfc(absPath: string): Promise<SFCDescriptor | null> {
  if (cache.has(absPath)) return cache.get(absPath) ?? null;
  let source: string;
  try {
    source = await readFile(absPath, 'utf8');
  } catch {
    cache.set(absPath, null);
    return null;
  }
  const { descriptor, errors } = parse(source, { filename: absPath });
  if (errors.length > 0 || !descriptor.template) {
    cache.set(absPath, null);
    return null;
  }
  cache.set(absPath, descriptor);
  return descriptor;
}

export function clearSfcCache(): void {
  cache.clear();
}
