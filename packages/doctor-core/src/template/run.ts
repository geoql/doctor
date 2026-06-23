import type { Diagnostic, Severity } from '../types.js';
import { parseSfc } from './parse-sfc.js';
import { TEMPLATE_RULES } from './rules/index.js';
import { VAPOR_CAPABILITY, isVaporSfc } from './vapor.js';

export interface TemplatePassOptions {
  files: string[];
  ruleOverrides?: Record<string, Severity | 'off'>;
}

function capabilityGated(
  rule: { requires?: readonly string[]; disabledBy?: readonly string[] },
  caps: ReadonlySet<string>,
): boolean {
  if (rule.disabledBy?.some((c) => caps.has(c))) return true;
  if (rule.requires?.some((c) => !caps.has(c))) return true;
  return false;
}

export async function runTemplatePass(
  opts: TemplatePassOptions,
): Promise<Diagnostic[]> {
  const all: Diagnostic[] = [];
  for (const file of opts.files) {
    if (!file.endsWith('.vue')) continue;
    const descriptor = await parseSfc(file);
    if (!descriptor?.template?.ast) continue;
    const caps = new Set<string>();
    if (isVaporSfc(descriptor)) caps.add(VAPOR_CAPABILITY);
    for (const rule of TEMPLATE_RULES) {
      const override = opts.ruleOverrides?.[rule.id];
      if (override === 'off') continue;
      if (capabilityGated(rule, caps)) continue;
      const { diagnostics } = rule.check({
        file,
        template: descriptor.template.ast,
        script: descriptor.scriptSetup?.content ?? descriptor.script?.content,
      });
      for (const d of diagnostics) {
        all.push(override ? { ...d, severity: override } : d);
      }
    }
  }
  return all;
}
