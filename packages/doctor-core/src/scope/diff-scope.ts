/**
 * Which code a finding belongs to for `--scope contextual`: a finding is
 * reported when its owner's range intersects the change. The Vue-native
 * analogue of react.doctor's `diffScope` (`jsx-element` → `template-element`,
 * plus `component` for SFC-level structure).
 */
export type DiffScope =
  | 'line'
  | 'template-element'
  | 'function'
  | 'component'
  | 'file';

const TEMPLATE_ELEMENT: readonly string[] = [
  'vue-doctor/template/v-for-has-key',
  'vue-doctor/template/v-if-v-for-precedence',
  'vue-doctor/template/v-memo-on-large-list',
  'vue-doctor/template/no-inline-object-prop-in-list',
  'vue-doctor/template/no-random-key',
  'vue-doctor/template/no-computed-getter-in-template-loop',
  'vue-doctor/template/avoid-deep-v-bind-spread-in-list',
  'vue-doctor/template/no-v-memo-in-vapor',
  'vue-doctor/security/no-v-html',
  'vue-doctor/security/no-target-blank-without-rel',
  'vue-doctor/security/no-javascript-uri',
  'vue-doctor/design/no-arbitrary-tailwind-values',
  'vue-doctor/design/no-default-tailwind-palette',
  'vue-doctor/design/no-important-utility',
  'vue-doctor/design/no-hardcoded-inline-style',
  'vue-doctor/design/no-missing-alt',
  'vue-doctor/design/no-absurd-z-index',
  'vue-doctor/design/no-gradient-text',
  'vue-doctor/design/no-pure-black-background',
  'vue-doctor/design/no-decorative-blur-orb',
  'vue-doctor/design/no-decorative-grid-background',
  'vue-doctor/design/no-radial-halo',
  'vue-doctor/design/no-hero-eyebrow-chip',
  'vue-doctor/design/no-emoji-heading-decoration',
];

const FUNCTION: readonly string[] = [
  'vue/no-lifecycle-after-await',
  'vue/return-in-computed-property',
  'vue-doctor/reactivity/watch-without-cleanup',
  'vue-doctor/reactivity/no-fresh-deps-in-watch',
  'vue-doctor/reactivity/no-stale-timer-ref',
  'vue-doctor/reactivity/effect-listener-cleanup-mismatch',
  'vue-doctor/composition/no-prop-callback-in-setup',
  'vue-doctor/performance/prefer-module-scope-pure-function',
  'vue-doctor/performance/prefer-module-scope-static-value',
  'nuxt-doctor/hydration/no-document-in-setup',
  'nuxt-doctor/hydration/no-browser-global-in-computed',
  'nuxt-doctor/server-routes/defineEventHandler-typed',
  'nuxt-doctor/server-routes/validate-body-with-h3-v2',
  'nuxt-doctor/server-routes/createError-on-failure',
];

const COMPONENT: readonly string[] = [
  'vue/max-props',
  'vue/define-props-declaration',
  'vue/define-emits-declaration',
  'vue-doctor/sfc/no-mixed-options-and-composition-api',
  'vue-doctor/composition/prefer-script-setup-for-new-files',
  'vue-doctor/composition/defineProps-typed',
  'vue-doctor/design/no-fake-browser-chrome',
  'vue-doctor/design/no-uniform-feature-card-grid',
  'vue-doctor/design/no-repeated-glass-surfaces',
];

const FILE: readonly string[] = [
  'dead-code/unused-file',
  'nuxt-doctor/seo/useSeoMeta-on-public-page',
  'nuxt-doctor/seo/og-image-defined',
  'nuxt-doctor/structure/uses-app-directory',
  'nuxt-doctor/nitro/compatibilityDate-set',
  'nuxt-doctor/nitro/preset-defined-for-deploy-target',
  'nuxt-doctor/cloudflare/nitro-cloudflare-preset',
];

/** Explicit owner declarations; every other rule keeps `line` matching. */
export const RULE_DIFF_SCOPES: ReadonlyMap<string, DiffScope> = new Map([
  ...TEMPLATE_ELEMENT.map((id) => [id, 'template-element'] as const),
  ...FUNCTION.map((id) => [id, 'function'] as const),
  ...COMPONENT.map((id) => [id, 'component'] as const),
  ...FILE.map((id) => [id, 'file'] as const),
]);

export function getRuleDiffScope(ruleId: string): DiffScope {
  return RULE_DIFF_SCOPES.get(ruleId) ?? 'line';
}
