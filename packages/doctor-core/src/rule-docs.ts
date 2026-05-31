import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { docsUrl } from './reporters/docs-url.js';
import { RULE_REGISTRY } from './rule-registry.js';
import type { RegisteredRule } from './rule-registry.js';

export interface RuleDoc {
  readonly id: string;
  readonly title: string;
  readonly severity: string;
  readonly category: string;
  readonly recommended: boolean;
  readonly source: string;
  readonly helpUri: string;
  readonly description: string;
  readonly hasOverride: boolean;
}

function autoDescription(rule: RegisteredRule): string {
  const presetNote = rule.recommended
    ? 'Active in the `recommended` preset.'
    : 'Off by default in `recommended`; enable via `--rule <id>:warn` or in `doctor.config.ts`.';
  return `\`${rule.id}\` is a ${rule.severity}-severity ${rule.category} rule from ${rule.source}. ${presetNote}\n\nSee ${docsUrl(rule.id)} for details when the docs site lands.`;
}

function resolveDocsRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, '..', 'docs', 'rules');
}

function safeReadOverride(ruleId: string, docsRoot: string): string | null {
  const safeName = `${ruleId.replace(/\//g, '__')}.md`;
  const candidate = join(docsRoot, safeName);
  if (!existsSync(candidate)) return null;
  return readFileSync(candidate, 'utf-8');
}

export interface LoadRuleDocOptions {
  readonly docsRoot?: string;
}

export function loadRuleDoc(
  ruleId: string,
  options: LoadRuleDocOptions = {},
): RuleDoc | null {
  const rule = RULE_REGISTRY.find((r) => r.id === ruleId);
  if (!rule) return null;
  const docsRoot = options.docsRoot ?? resolveDocsRoot();
  const override = safeReadOverride(ruleId, docsRoot);
  const description = override ?? autoDescription(rule);
  return {
    id: rule.id,
    title: rule.id,
    severity: rule.severity,
    category: rule.category,
    recommended: rule.recommended,
    source: rule.source,
    helpUri: docsUrl(rule.id),
    description,
    hasOverride: override !== null,
  };
}

export function loadAllRuleDocs(options: LoadRuleDocOptions = {}): RuleDoc[] {
  return RULE_REGISTRY.map((rule) => loadRuleDoc(rule.id, options) as RuleDoc);
}
