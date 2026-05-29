import type { SFCDescriptor } from '@vue/compiler-sfc';
import type { Diagnostic } from '../../types.js';

export interface SfcRuleContext {
  file: string;
  descriptor: SFCDescriptor;
}

export interface SfcRuleResult {
  diagnostics: Diagnostic[];
}

export interface SfcRule {
  id: string;
  check: (ctx: SfcRuleContext) => SfcRuleResult;
}
