import type { Diagnostic, Severity } from '../types.js';
import { parseSfc } from './parse-sfc.js';
import { TEMPLATE_RULES } from './rules/index.js';

export interface TemplatePassOptions {
  files: string[];
  ruleOverrides?: Record<string, Severity | 'off'>;
}

export async function runTemplatePass(
  opts: TemplatePassOptions,
): Promise<Diagnostic[]> {
  const all: Diagnostic[] = [];
  for (const file of opts.files) {
    if (!file.endsWith('.vue')) continue;
    const descriptor = await parseSfc(file);
    if (!descriptor?.template?.ast) continue;
    for (const rule of TEMPLATE_RULES) {
      const override = opts.ruleOverrides?.[rule.id];
      if (override === 'off') continue;
      const { diagnostics } = rule.check({
        file,
        template: descriptor.template.ast,
      });
      for (const d of diagnostics) {
        all.push(override ? { ...d, severity: override } : d);
      }
    }
  }
  return all;
}
