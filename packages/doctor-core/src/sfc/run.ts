import type { Diagnostic, Severity } from '../types.js';
import { parseSfcDescriptor } from './parse-sfc-descriptor.js';
import { SFC_RULES } from './rules/index.js';

export interface SfcPassOptions {
  files: string[];
  ruleOverrides?: Record<string, Severity | 'off'>;
}

export async function runSfcPass(opts: SfcPassOptions): Promise<Diagnostic[]> {
  const all: Diagnostic[] = [];
  for (const file of opts.files) {
    if (!file.endsWith('.vue')) continue;
    const descriptor = await parseSfcDescriptor(file);
    if (!descriptor) continue;
    for (const rule of SFC_RULES) {
      const override = opts.ruleOverrides?.[rule.id];
      if (override === 'off') continue;
      const { diagnostics } = rule.check({ file, descriptor });
      for (const d of diagnostics) {
        all.push(override ? { ...d, severity: override } : d);
      }
    }
  }
  return all;
}
