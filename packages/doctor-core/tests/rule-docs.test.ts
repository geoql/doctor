import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadAllRuleDocs, loadRuleDoc } from '../src/rule-docs.js';
import { RULE_REGISTRY } from '../src/rule-registry.js';

describe('rule-docs', () => {
  let tmpDocsRoot: string;

  beforeEach(() => {
    tmpDocsRoot = mkdtempSync(join(tmpdir(), 'geoql-doctor-docs-'));
  });

  afterEach(() => {
    rmSync(tmpDocsRoot, { recursive: true, force: true });
  });

  it('returns null for unknown rule ids', () => {
    expect(loadRuleDoc('does/not/exist', { docsRoot: tmpDocsRoot })).toBeNull();
  });

  it('returns auto-generated doc for every registered rule', () => {
    for (const rule of RULE_REGISTRY) {
      const doc = loadRuleDoc(rule.id, { docsRoot: tmpDocsRoot });
      expect(doc).not.toBeNull();
      expect(doc!.id).toBe(rule.id);
      expect(doc!.severity).toBe(rule.severity);
      expect(doc!.category).toBe(rule.category);
      expect(doc!.recommended).toBe(rule.recommended);
      expect(doc!.source).toBe(rule.source);
      expect(doc!.helpUri).toContain('docs.the-doctor.report');
      expect(doc!.description).toContain(rule.id);
      expect(doc!.hasOverride).toBe(false);
    }
  });

  it('auto-description mentions recommended-preset membership when enabled', () => {
    const recommended = RULE_REGISTRY.find((r) => r.recommended);
    expect(recommended).toBeDefined();
    const doc = loadRuleDoc(recommended!.id, { docsRoot: tmpDocsRoot });
    expect(doc!.description).toContain('Active in the `recommended` preset');
  });

  it('auto-description notes opt-in instructions for off-by-default rules', () => {
    const offByDefault = RULE_REGISTRY.find((r) => !r.recommended);
    expect(offByDefault).toBeDefined();
    const doc = loadRuleDoc(offByDefault!.id, { docsRoot: tmpDocsRoot });
    expect(doc!.description).toContain('Off by default in `recommended`');
    expect(doc!.description).toContain('--rule <id>:warn');
  });

  it('uses an on-disk override when <ruleId>.md exists (slashes -> __)', () => {
    const rule = RULE_REGISTRY[0]!;
    const fileName = `${rule.id.replace(/\//g, '__')}.md`;
    writeFileSync(join(tmpDocsRoot, fileName), '# Custom\n\nProse override.');
    const doc = loadRuleDoc(rule.id, { docsRoot: tmpDocsRoot });
    expect(doc!.hasOverride).toBe(true);
    expect(doc!.description).toContain('Prose override.');
    expect(doc!.description).not.toContain('Active in the');
  });

  it('falls back to the auto-doc when override file is absent', () => {
    const rule = RULE_REGISTRY[0]!;
    const doc = loadRuleDoc(rule.id, { docsRoot: tmpDocsRoot });
    expect(doc!.hasOverride).toBe(false);
  });

  it('loadAllRuleDocs returns one doc per registered rule', () => {
    const docs = loadAllRuleDocs({ docsRoot: tmpDocsRoot });
    expect(docs.length).toBe(RULE_REGISTRY.length);
    const ids = new Set(docs.map((d) => d.id));
    expect(ids.size).toBe(docs.length);
  });

  it('uses default docsRoot resolved from import.meta.url when no override path given', () => {
    const doc = loadRuleDoc(RULE_REGISTRY[0]!.id);
    expect(doc).not.toBeNull();
    expect(doc!.hasOverride).toBe(false);
  });
});
