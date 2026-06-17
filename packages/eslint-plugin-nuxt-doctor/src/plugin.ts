import {
  type CoreRule,
  type Severity,
  NUXT_RULES,
} from '@geoql/doctor-rule-core';
import { toESLintRule } from '@geoql/eslint-plugin-vue-doctor';

type ESLintSeverity = 'error' | 'warn';

export interface NuxtDoctorRuleModule {
  readonly id: string;
  readonly severity: Severity;
  readonly recommended: boolean;
  readonly category: string;
}

export interface NuxtDoctorConfig {
  readonly files: ReadonlyArray<string>;
  readonly plugins: { readonly 'nuxt-doctor': NuxtDoctorPlugin };
  readonly rules: Readonly<Record<string, ESLintSeverity>>;
}

export interface NuxtDoctorPlugin {
  readonly meta: { readonly name: 'nuxt-doctor'; readonly version: string };
  readonly rules: Readonly<Record<string, ReturnType<typeof toESLintRule>>>;
  readonly ruleMeta: Readonly<Record<string, NuxtDoctorRuleModule>>;
  readonly configs: {
    readonly recommended: ReadonlyArray<NuxtDoctorConfig>;
    readonly all: ReadonlyArray<NuxtDoctorConfig>;
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
): Record<string, NuxtDoctorRuleModule> {
  const out: Record<string, NuxtDoctorRuleModule> = {};
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

const NUXT_DOCTOR_VERSION = '1.0.0';

const rules = toRecord(NUXT_RULES);
const ruleMeta = toMetaRecord(NUXT_RULES);

function buildConfigs(self: NuxtDoctorPlugin): NuxtDoctorPlugin['configs'] {
  const recommendedConfig: NuxtDoctorConfig = {
    files: ['**/*.{js,jsx,ts,tsx,vue}'],
    plugins: { 'nuxt-doctor': self },
    rules: Object.fromEntries(
      NUXT_RULES.filter((r) => r.recommended).map((r) => [
        `nuxt-doctor/${r.id}`,
        SEVERITY_TO_ESLINT[r.severity],
      ]),
    ),
  };
  const allConfig: NuxtDoctorConfig = {
    files: ['**/*.{js,jsx,ts,tsx,vue}'],
    plugins: { 'nuxt-doctor': self },
    rules: Object.fromEntries(
      NUXT_RULES.map((r) => [
        `nuxt-doctor/${r.id}`,
        SEVERITY_TO_ESLINT[r.severity],
      ]),
    ),
  };
  return {
    recommended: [recommendedConfig],
    all: [allConfig],
  };
}

const plugin: NuxtDoctorPlugin = {
  meta: { name: 'nuxt-doctor', version: NUXT_DOCTOR_VERSION },
  rules,
  ruleMeta,
  configs: { recommended: [], all: [] },
};

const finalPlugin: NuxtDoctorPlugin = {
  meta: { name: 'nuxt-doctor', version: NUXT_DOCTOR_VERSION },
  rules,
  ruleMeta,
  configs: buildConfigs(plugin),
};

export default finalPlugin;
export { finalPlugin as plugin };
