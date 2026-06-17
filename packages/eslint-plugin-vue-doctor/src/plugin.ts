import {
  type CoreRule,
  type Severity,
  VUE_RULES,
} from '@geoql/doctor-rule-core';
import { toESLintRule } from './to-eslint-rule.js';

type ESLintSeverity = 'error' | 'warn';

export interface VueDoctorRuleModule {
  readonly id: string;
  readonly severity: Severity;
  readonly recommended: boolean;
  readonly category: string;
}

export interface VueDoctorConfig {
  readonly files: ReadonlyArray<string>;
  readonly plugins: { readonly 'vue-doctor': VueDoctorPlugin };
  readonly rules: Readonly<Record<string, ESLintSeverity>>;
  readonly settings?: {
    readonly 'vue-doctor': { readonly capabilities: string[] };
  };
}

export interface VueDoctorPlugin {
  readonly meta: { readonly name: 'vue-doctor'; readonly version: string };
  readonly rules: Readonly<Record<string, ReturnType<typeof toESLintRule>>>;
  readonly ruleMeta: Readonly<Record<string, VueDoctorRuleModule>>;
  readonly configs: {
    readonly recommended: ReadonlyArray<VueDoctorConfig>;
    readonly all: ReadonlyArray<VueDoctorConfig>;
  };
}

const SEVERITY_TO_ESLINT: Readonly<Record<Severity, ESLintSeverity>> = {
  error: 'error',
  warn: 'warn',
  info: 'warn',
};

function toRecord(
  rules: readonly CoreRule[],
): Record<string, ReturnType<typeof toESLintRule>> {
  const out: Record<string, ReturnType<typeof toESLintRule>> = {};
  for (const core of rules) {
    out[core.id] = toESLintRule(core);
  }
  return out;
}

function toMetaRecord(
  rules: readonly CoreRule[],
): Record<string, VueDoctorRuleModule> {
  const out: Record<string, VueDoctorRuleModule> = {};
  for (const core of rules) {
    out[core.id] = {
      id: core.id,
      severity: core.severity,
      recommended: core.recommended,
      category: core.category,
    };
  }
  return out;
}

const VUE_DOCTOR_VERSION = '1.0.0';

const rules = toRecord(VUE_RULES);
const ruleMeta = toMetaRecord(VUE_RULES);

function buildConfigs(self: VueDoctorPlugin): VueDoctorPlugin['configs'] {
  const recommendedConfig: VueDoctorConfig = {
    files: ['**/*.{js,jsx,ts,tsx,vue}'],
    plugins: { 'vue-doctor': self },
    rules: Object.fromEntries(
      VUE_RULES.filter((r) => r.recommended).map((r) => [
        `vue-doctor/${r.id}`,
        SEVERITY_TO_ESLINT[r.severity],
      ]),
    ),
    settings: { 'vue-doctor': { capabilities: [] } },
  };
  const allConfig: VueDoctorConfig = {
    files: ['**/*.{js,jsx,ts,tsx,vue}'],
    plugins: { 'vue-doctor': self },
    rules: Object.fromEntries(
      VUE_RULES.map((r) => [
        `vue-doctor/${r.id}`,
        SEVERITY_TO_ESLINT[r.severity],
      ]),
    ),
  };
  return {
    recommended: [recommendedConfig],
    all: [allConfig],
  };
}

const plugin: VueDoctorPlugin = {
  meta: { name: 'vue-doctor', version: VUE_DOCTOR_VERSION },
  rules,
  ruleMeta,
  configs: { recommended: [], all: [] },
};

const finalPlugin: VueDoctorPlugin = {
  meta: { name: 'vue-doctor', version: VUE_DOCTOR_VERSION },
  rules,
  ruleMeta,
  configs: buildConfigs(plugin),
};

export default finalPlugin;
export { finalPlugin as plugin };
