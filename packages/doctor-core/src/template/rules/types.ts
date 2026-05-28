import type { RootNode } from '@vue/compiler-core';
import type { Diagnostic } from '../../types.js';

export interface TemplateRuleContext {
  file: string;
  template: RootNode;
}

export interface TemplateRuleResult {
  diagnostics: Diagnostic[];
}

export interface TemplateRule {
  id: string;
  check: (ctx: TemplateRuleContext) => TemplateRuleResult;
}
