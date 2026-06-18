import { describe, expect, it } from 'vitest';
import { renderAgentPlaybook, renderRulePrompt } from '../src/rule-prompt.js';
import { RULE_REGISTRY } from '../src/rule-registry.js';

describe('renderRulePrompt', () => {
  it('returns null for an unknown rule id', () => {
    expect(renderRulePrompt('does/not/exist')).toBeNull();
    expect(renderRulePrompt('')).toBeNull();
  });

  it('renders non-empty markdown with every required section for each registered rule', () => {
    for (const rule of RULE_REGISTRY) {
      const md = renderRulePrompt(rule.id);
      expect(md, `expected markdown for ${rule.id}`).not.toBeNull();
      const text = md as string;
      expect(text.length).toBeGreaterThan(0);
      // rule id, severity, category surfaced
      expect(text).toContain(rule.id);
      expect(text).toContain(rule.severity);
      expect(text).toContain(rule.category);
      // required headings
      expect(text).toContain('## Why this matters');
      expect(text).toContain('## How to fix');
      expect(text).toContain('## How to validate');
      // canonical helpUri (derived from RuleDoc, not hardcoded domain in test)
      expect(text).toContain(`docs.the-doctor.report/rules/${rule.id}`);
      // validate step re-runs the audit scoped to this rule
      expect(text).toContain(`--rule ${rule.id}`);
    }
  });

  it('uses the vue-doctor CLI for vue/dead-code rules', () => {
    const md = renderRulePrompt('vue-doctor/template/v-for-has-key');
    expect(md).toContain('@geoql/vue-doctor');
    expect(md).not.toContain('@geoql/nuxt-doctor');
  });

  it('uses the nuxt-doctor CLI for nuxt rules', () => {
    const md = renderRulePrompt('nuxt-doctor/ai-slop/no-process-client-server');
    expect(md).toContain('@geoql/nuxt-doctor');
    expect(md).not.toContain('@geoql/vue-doctor');
  });

  it('surfaces preset membership for recommended and off-by-default rules', () => {
    const recommended = RULE_REGISTRY.find((r) => r.recommended);
    const offByDefault = RULE_REGISTRY.find((r) => !r.recommended);
    expect(recommended).toBeDefined();
    expect(offByDefault).toBeDefined();
    expect(renderRulePrompt(recommended!.id)).toContain('recommended');
    expect(renderRulePrompt(offByDefault!.id)).toContain('off by default');
  });
});

describe('renderAgentPlaybook', () => {
  const playbook = renderAgentPlaybook();

  it('documents the scan -> filter -> triage -> fix -> validate loop', () => {
    expect(playbook).toContain('Scan');
    expect(playbook).toContain('Filter');
    expect(playbook).toContain('Triage');
    expect(playbook).toContain('Fix');
    expect(playbook).toContain('Validate');
  });

  it('carries the no-commit / no-PR guardrail', () => {
    expect(playbook).toContain('NEVER commit');
    expect(playbook).toContain('NEVER open');
  });

  it('references the real doctor CLI commands and flags', () => {
    expect(playbook).toContain('npx @geoql/vue-doctor');
    expect(playbook).toContain('npx @geoql/nuxt-doctor');
    expect(playbook).toContain('--diff');
    expect(playbook).toContain('--staged');
    expect(playbook).toContain('--full');
    expect(playbook).toContain('--score');
    expect(playbook).toContain('--json');
    expect(playbook).toContain('--rule');
    expect(playbook).toContain('explain');
    expect(playbook).toContain('list-rules');
  });

  it('points at the on-demand per-rule prompt endpoints', () => {
    expect(playbook).toContain('/prompts/rules/');
  });
});
