import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { RuleCategory } from '../src/rule-registry.js';
import { RULE_REGISTRY } from '../src/rule-registry.js';

// The `rule-registry-consistency` test covers the ENUMERABLE sources (oxlint
// plugins, template, sfc, dead-code) whose ids are reachable as exported
// arrays. The remaining `source:'doctor'` rules are project passes and
// cross-file passes whose ids are authored inline as `RULE_ID = '...'` or
// `ruleId: '...'` literals with no enumerable export. A registry entry with a
// typo (or a phantom id no pass ever emits) would slip past every runtime test
// AND surface in `list-rules` as a rule that can never fire. This scan closes
// that blind spot: every non-enumerable registry id must appear verbatim in the
// src tree.

const NON_ENUMERABLE_CATEGORIES: ReadonlySet<RuleCategory> =
  new Set<RuleCategory>([
    'build-quality',
    'deps',
    'structure',
    'modules-deps',
    'nitro',
    'seo',
    'cloudflare',
    'security',
    'design',
    'data-fetching',
  ]);

const SRC_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

// The registry declares the ids; scanning it would make every check vacuously
// true. Exclude it so a match proves an *implementation* pass emits the id.
const EXCLUDED_FILES: ReadonlySet<string> = new Set(['rule-registry.ts']);

function collectSourceText(dir: string): string {
  let text = '';
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      text += collectSourceText(full);
    } else if (entry.endsWith('.ts') && !EXCLUDED_FILES.has(entry)) {
      text += readFileSync(full, 'utf8');
    }
  }
  return text;
}

const SRC_TEXT = collectSourceText(SRC_ROOT);

describe('rule-registry source scan: every non-enumerable registry id is implemented', () => {
  const nonEnumerableIds = RULE_REGISTRY.filter(
    (r) => r.source === 'doctor' && NON_ENUMERABLE_CATEGORIES.has(r.category),
  ).map((r) => r.id);

  it('has a source occurrence for every project/cross-file registry id', () => {
    const orphans = nonEnumerableIds.filter(
      (id) => !SRC_TEXT.includes(`'${id}'`),
    );
    expect(
      orphans,
      `registry ids with no matching RULE_ID/ruleId literal in src (phantom or typo): ${orphans.join(', ')}`,
    ).toEqual([]);
  });

  it('covers a meaningful set of non-enumerable rules', () => {
    // Guard against the filter silently matching nothing (which would make the
    // scan vacuously green if the category set drifted).
    expect(nonEnumerableIds.length).toBeGreaterThan(10);
  });
});
