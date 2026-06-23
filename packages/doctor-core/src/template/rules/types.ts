import type { RootNode } from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';

export interface TemplateRuleContext {
  file: string;
  template: RootNode;
  script?: string;
}

export interface TemplateRuleResult {
  diagnostics: Diagnostic[];
}

export interface TemplateRule {
  id: string;
  check: (ctx: TemplateRuleContext) => TemplateRuleResult;
  /** Capability tokens that must ALL be present for the rule to run. */
  requires?: readonly string[];
  /** Capability tokens that suppress the rule when ANY is present. */
  disabledBy?: readonly string[];
}
