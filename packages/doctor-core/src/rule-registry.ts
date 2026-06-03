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
  | 'vue-builtin'
  | 'structure'
  | 'modules-deps'
  | 'nitro'
  | 'seo'
  | 'cloudflare'
  | 'server-routes'
  | 'hydration'
  | 'data-fetching';

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
    id: 'vue/no-arrow-functions-in-watch',
    severity: 'error',
    category: 'vue-builtin',
    source: 'oxlint-builtin',
    recommended: true,
  },
  {
    id: 'vue/no-deprecated-data-object-declaration',
    severity: 'error',
    category: 'vue-builtin',
    source: 'oxlint-builtin',
    recommended: true,
  },
  {
    id: 'vue/no-deprecated-events-api',
    severity: 'error',
    category: 'vue-builtin',
    source: 'oxlint-builtin',
    recommended: true,
  },
  {
    id: 'vue/no-deprecated-destroyed-lifecycle',
    severity: 'error',
    category: 'vue-builtin',
    source: 'oxlint-builtin',
    recommended: true,
  },
  {
    id: 'vue/no-deprecated-model-definition',
    severity: 'error',
    category: 'vue-builtin',
    source: 'oxlint-builtin',
    recommended: true,
  },
  {
    id: 'vue/no-deprecated-delete-set',
    severity: 'error',
    category: 'vue-builtin',
    source: 'oxlint-builtin',
    recommended: true,
  },
  {
    id: 'vue/no-deprecated-vue-config-keycodes',
    severity: 'error',
    category: 'vue-builtin',
    source: 'oxlint-builtin',
    recommended: true,
  },
  {
    id: 'vue/no-lifecycle-after-await',
    severity: 'error',
    category: 'vue-builtin',
    source: 'oxlint-builtin',
    recommended: true,
  },
  {
    id: 'vue/no-this-in-before-route-enter',
    severity: 'error',
    category: 'vue-builtin',
    source: 'oxlint-builtin',
    recommended: true,
  },
  {
    id: 'vue/return-in-computed-property',
    severity: 'error',
    category: 'vue-builtin',
    source: 'oxlint-builtin',
    recommended: true,
  },
  {
    id: 'vue/valid-define-emits',
    severity: 'error',
    category: 'vue-builtin',
    source: 'oxlint-builtin',
    recommended: true,
  },
  {
    id: 'vue/valid-define-props',
    severity: 'error',
    category: 'vue-builtin',
    source: 'oxlint-builtin',
    recommended: true,
  },
  {
    id: 'vue/no-required-prop-with-default',
    severity: 'warn',
    category: 'vue-builtin',
    source: 'oxlint-builtin',
    recommended: true,
  },
  {
    id: 'vue/prefer-import-from-vue',
    severity: 'warn',
    category: 'vue-builtin',
    source: 'oxlint-builtin',
    recommended: true,
  },
  {
    id: 'vue/no-import-compiler-macros',
    severity: 'warn',
    category: 'vue-builtin',
    source: 'oxlint-builtin',
    recommended: true,
  },
  {
    id: 'vue/no-multiple-slot-args',
    severity: 'warn',
    category: 'vue-builtin',
    source: 'oxlint-builtin',
    recommended: true,
  },
  {
    id: 'vue/require-default-export',
    severity: 'warn',
    category: 'vue-builtin',
    source: 'oxlint-builtin',
    recommended: true,
  },
  {
    id: 'vue/define-emits-declaration',
    severity: 'info',
    category: 'vue-builtin',
    source: 'oxlint-builtin',
    recommended: false,
  },
  {
    id: 'vue/define-props-declaration',
    severity: 'info',
    category: 'vue-builtin',
    source: 'oxlint-builtin',
    recommended: false,
  },
  {
    id: 'vue/define-props-destructuring',
    severity: 'info',
    category: 'vue-builtin',
    source: 'oxlint-builtin',
    recommended: false,
  },
  {
    id: 'vue/max-props',
    severity: 'info',
    category: 'vue-builtin',
    source: 'oxlint-builtin',
    recommended: false,
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

  // ── Nuxt project post-checks ────────────────────────────────────────────────
  {
    id: 'nuxt-doctor/structure/uses-app-directory',
    severity: 'warn',
    category: 'structure',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'nuxt-doctor/structure/nuxt-major-current',
    severity: 'info',
    category: 'structure',
    source: 'doctor',
    recommended: false,
  },
  {
    id: 'nuxt-doctor/modules-deps/no-modules-incompatible-with-nuxt-4',
    severity: 'warn',
    category: 'modules-deps',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'nuxt-doctor/modules-deps/recommended-modules-installed',
    severity: 'info',
    category: 'modules-deps',
    source: 'doctor',
    recommended: false,
  },
  {
    id: 'nuxt-doctor/nitro/compatibilityDate-set',
    severity: 'error',
    category: 'nitro',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'nuxt-doctor/nitro/preset-defined-for-deploy-target',
    severity: 'warn',
    category: 'nitro',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'nuxt-doctor/nitro/runtime-config-typed',
    severity: 'info',
    category: 'nitro',
    source: 'doctor',
    recommended: false,
  },
  {
    id: 'nuxt-doctor/seo/lang-on-html',
    severity: 'warn',
    category: 'seo',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'nuxt-doctor/seo/useSeoMeta-on-public-page',
    severity: 'warn',
    category: 'seo',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'nuxt-doctor/seo/og-image-defined',
    severity: 'warn',
    category: 'seo',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'nuxt-doctor/cloudflare/nitro-cloudflare-preset',
    severity: 'warn',
    category: 'cloudflare',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'nuxt-doctor/cloudflare/og-image-via-satori',
    severity: 'info',
    category: 'cloudflare',
    source: 'doctor',
    recommended: false,
  },
  {
    id: 'nuxt-doctor/cloudflare/no-node-only-modules',
    severity: 'warn',
    category: 'cloudflare',
    source: 'doctor',
    recommended: true,
  },

  // ── Nuxt cross-file rules ────────────────────────────────────────────────────
  {
    id: 'nuxt-doctor/data-fetching/no-shared-key-across-pages',
    severity: 'warn',
    category: 'data-fetching',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'nuxt-doctor/data-fetching/ssr-safe-onMounted-only-for-client',
    severity: 'warn',
    category: 'data-fetching',
    source: 'doctor',
    recommended: true,
  },

  // ── Nuxt SFC rules ──────────────────────────────────────────────────────────
  {
    id: 'nuxt-doctor/ai-slop/no-mixed-app-and-root-layout',
    severity: 'warn',
    category: 'ai-slop',
    source: 'doctor',
    recommended: true,
  },

  // ── Nuxt oxlint-plugin rules (source 'doctor') ──────────────────────────────
  {
    id: 'nuxt-doctor/ai-slop/no-process-client-server',
    severity: 'error',
    category: 'ai-slop',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'nuxt-doctor/ai-slop/no-explicit-imports-of-auto-imported',
    severity: 'warn',
    category: 'ai-slop',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'nuxt-doctor/ai-slop/no-useState-for-server-data',
    severity: 'warn',
    category: 'ai-slop',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'nuxt-doctor/ai-slop/no-fetch-in-setup',
    severity: 'warn',
    category: 'ai-slop',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'nuxt-doctor/data-fetching/useAsyncData-key-required-in-loop',
    severity: 'error',
    category: 'data-fetching',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'nuxt-doctor/server-routes/defineEventHandler-typed',
    severity: 'warn',
    category: 'server-routes',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'nuxt-doctor/server-routes/validate-body-with-h3-v2',
    severity: 'warn',
    category: 'server-routes',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'nuxt-doctor/server-routes/createError-on-failure',
    severity: 'warn',
    category: 'server-routes',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'nuxt-doctor/hydration/no-document-in-setup',
    severity: 'error',
    category: 'hydration',
    source: 'doctor',
    recommended: true,
  },
  {
    id: 'nuxt-doctor/hydration/clientOnly-for-browser-apis',
    severity: 'error',
    category: 'hydration',
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
