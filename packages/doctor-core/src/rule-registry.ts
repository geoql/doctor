import type { Severity } from './types.js';

export type RuleCategory =
  | 'ai-slop'
  | 'reactivity'
  | 'composition'
  | 'performance'
  | 'template'
  | 'template-perf'
  | 'build-quality'
  | 'deps'
  | 'dead-code'
  | 'sfc'
  | 'vue-builtin';

export type RuleSource = 'doctor' | 'oxlint-builtin' | 'eslint-plugin-vue';

export interface RegisteredRule {
  readonly id: string;
  readonly severity: Severity;
  readonly category: RuleCategory;
  readonly source: RuleSource;
  readonly recommended: boolean;
}

export const RULE_REGISTRY: readonly RegisteredRule[] = [
  {
    id: 'vue/no-export-in-script-setup',
    severity: 'error',
    category: 'vue-builtin',
    source: 'oxlint-builtin',
    recommended: true,
  },
  {
    id: 'vue/require-typed-ref',
    severity: 'warn',
    category: 'vue-builtin',
    source: 'oxlint-builtin',
    recommended: true,
  },

  {
    id: 'vue-doctor/no-em-dash-in-string',
    severity: 'warn',
    category: 'ai-slop',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'vue-doctor/no-destructure-props-without-to-refs',
    severity: 'error',
    category: 'ai-slop',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'vue-doctor/no-destructure-reactive-without-to-refs',
    severity: 'error',
    category: 'ai-slop',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'vue-doctor/no-non-null-assertion-on-ref-value',
    severity: 'warn',
    category: 'ai-slop',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'vue-doctor/no-imports-from-vue-when-auto-imported',
    severity: 'warn',
    category: 'ai-slop',
    source: 'doctor',
    recommended: true,
  },

  {
    id: 'vue-doctor/reactivity/watch-without-cleanup',
    severity: 'warn',
    category: 'reactivity',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'vue-doctor/reactivity/prefer-shallowRef-for-large-data',
    severity: 'info',
    category: 'reactivity',
    source: 'doctor',
    recommended: false,
  },
  {
    id: 'vue-doctor/reactivity/prefer-readonly-for-injected',
    severity: 'info',
    category: 'reactivity',
    source: 'doctor',
    recommended: false,
  },

  {
    id: 'vue-doctor/composition/prefer-script-setup-for-new-files',
    severity: 'warn',
    category: 'composition',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'vue-doctor/composition/defineProps-typed',
    severity: 'warn',
    category: 'composition',
    source: 'doctor',
    recommended: true,
  },

  {
    id: 'vue-doctor/performance/prefer-defineAsyncComponent-on-route',
    severity: 'info',
    category: 'performance',
    source: 'doctor',
    recommended: false,
  },

  {
    id: 'vue-doctor/template/v-for-has-key',
    severity: 'error',
    category: 'template',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'vue-doctor/template/v-if-v-for-precedence',
    severity: 'error',
    category: 'template',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'vue-doctor/template/v-memo-on-large-list',
    severity: 'warn',
    category: 'performance',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'vue-doctor/template/no-inline-object-prop-in-list',
    severity: 'warn',
    category: 'performance',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'vue-doctor/template/no-computed-getter-in-template-loop',
    severity: 'warn',
    category: 'template-perf',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'vue-doctor/template/avoid-deep-v-bind-spread-in-list',
    severity: 'info',
    category: 'template-perf',
    source: 'doctor',
    recommended: true,
  },

  {
    id: 'vue-doctor/sfc/no-mixed-options-and-composition-api',
    severity: 'warn',
    category: 'sfc',
    source: 'doctor',
    recommended: true,
  },

  {
    id: 'vue-doctor/build-quality/tsconfig-strict-required',
    severity: 'warn',
    category: 'build-quality',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'vue-doctor/build-quality/vue-tsc-in-devDeps',
    severity: 'warn',
    category: 'build-quality',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'vue-doctor/build-quality/no-vue-cli',
    severity: 'warn',
    category: 'build-quality',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'vue-doctor/build-quality/eslint-plugin-vue-installed',
    severity: 'info',
    category: 'build-quality',
    source: 'doctor',
    recommended: true,
  },

  {
    id: 'vue-doctor/deps/duplicate-vue-versions',
    severity: 'error',
    category: 'deps',
    source: 'doctor',
    recommended: true,
  },

  {
    id: 'vue-doctor/deps/vue-major-current',
    severity: 'info',
    category: 'deps',
    source: 'doctor',
    recommended: false,
  },

  {
    id: 'dead-code/unused-file',
    severity: 'warn',
    category: 'dead-code',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'dead-code/unused-export',
    severity: 'warn',
    category: 'dead-code',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'dead-code/unused-type-export',
    severity: 'info',
    category: 'dead-code',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'dead-code/unused-member',
    severity: 'info',
    category: 'dead-code',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'dead-code/unused-dependency',
    severity: 'warn',
    category: 'dead-code',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'dead-code/unlisted-dependency',
    severity: 'error',
    category: 'dead-code',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'dead-code/duplicate-export',
    severity: 'warn',
    category: 'dead-code',
    source: 'doctor',
    recommended: true,
  },
];

export interface ListRulesFilter {
  readonly preset?: 'recommended' | 'all';
  readonly category?: RuleCategory;
  readonly source?: RuleSource;
  readonly severity?: Severity;
}

export function listRules(filter: ListRulesFilter = {}): RegisteredRule[] {
  let rules = [...RULE_REGISTRY];
  if (filter.preset === 'recommended') {
    rules = rules.filter((r) => r.recommended);
  }
  if (filter.category) {
    rules = rules.filter((r) => r.category === filter.category);
  }
  if (filter.source) {
    rules = rules.filter((r) => r.source === filter.source);
  }
  if (filter.severity) {
    rules = rules.filter((r) => r.severity === filter.severity);
  }
  return rules.sort((a, b) => a.id.localeCompare(b.id));
}
