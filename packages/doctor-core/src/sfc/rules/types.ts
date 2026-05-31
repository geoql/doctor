import type { SFCDescriptor } from '@vue/compiler-sfc';
import type { Diagnostic } from '../../types.js';
import type { ProjectInfo } from '../../types/project-info.js';

export interface SfcRuleContext {
  file: string;
  descriptor: SFCDescriptor;
  /** Absolute path of the root directory being audited. */
  rootDirectory: string;
  /**
   * Relative path of `file` from `rootDirectory` (e.g. "app/pages/index.vue").
   * Use this with isNuxtPageFile / isNuxtLayoutFile helpers.
   */
  relativePath: string;
  projectInfo?: ProjectInfo;
}

export interface SfcRuleResult {
  diagnostics: Diagnostic[];
}

export interface SfcRule {
  id: string;
  check: (ctx: SfcRuleContext) => SfcRuleResult;
}
