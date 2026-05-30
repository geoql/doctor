import { readFileSync } from 'node:fs';
import type { Diagnostic } from '../types.js';
import { parseDirectives, type DirectiveSet } from './parse-directives.js';

export interface ApplyInlineDisablesOptions {
  respect: boolean;
}

function ruleMatches(ruleId: string, rules: string[]): boolean {
  if (rules.length === 0) return true;
  return rules.some(
    (token) => ruleId === token || ruleId.endsWith(`/${token}`),
  );
}

function isSuppressed(set: DirectiveSet, diagnostic: Diagnostic): boolean {
  const { line, ruleId } = diagnostic;
  for (const block of set.blocks) {
    if (
      line >= block.start &&
      line <= block.end &&
      ruleMatches(ruleId, block.rules)
    ) {
      return true;
    }
  }
  for (const target of set.nextLine) {
    if (target.line === line && ruleMatches(ruleId, target.rules)) return true;
  }
  for (const target of set.sameLine) {
    if (target.line === line && ruleMatches(ruleId, target.rules)) return true;
  }
  return false;
}

function loadDirectives(
  file: string,
  cache: Map<string, DirectiveSet | null>,
): DirectiveSet | null {
  const cached = cache.get(file);
  if (cached !== undefined) return cached;
  let set: DirectiveSet | null;
  try {
    set = parseDirectives(readFileSync(file, 'utf-8'));
  } catch {
    set = null;
  }
  cache.set(file, set);
  return set;
}

export function applyInlineDisables(
  diags: Diagnostic[],
  opts: ApplyInlineDisablesOptions,
): Diagnostic[] {
  if (!opts.respect) return diags;
  const cache = new Map<string, DirectiveSet | null>();
  return diags.filter((diagnostic) => {
    const set = loadDirectives(diagnostic.file, cache);
    return set === null || !isSuppressed(set, diagnostic);
  });
}
