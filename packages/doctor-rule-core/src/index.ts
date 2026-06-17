export {
  type AstNode,
  type CoreRule,
  type Fix,
  type Fixer,
  type FixFn,
  type Plugin,
  type ReportDescriptor,
  type Rule,
  type RuleCategory,
  type RuleContext,
  type RuleMeta,
  type RuleVisitor,
  type Severity,
  type SourceLocation,
} from './types.js';
export { defineRule } from './define-rule.js';
export {
  NUXT_AUTO_IMPORTED,
  VUE_AUTO_IMPORTED,
} from './shared/auto-imported-symbols.js';
export { NUXT_RULES, VUE_RULES } from './rules/index.js';

// Individual rule cores — re-exported so oxlint plugins can `export { X } from '@geoql/doctor-rule-core'`
// without depending on internal paths. ESLint adapter (Wave #4) will consume these directly.
export { clientOnlyForBrowserApis } from './rules/nuxt/hydration/clientOnly-for-browser-apis.js';
export { noDocumentInSetup } from './rules/nuxt/hydration/no-document-in-setup.js';
export { createErrorOnFailure } from './rules/nuxt/server-routes/createError-on-failure.js';
export { defineEventHandlerTyped } from './rules/nuxt/server-routes/defineEventHandler-typed.js';
export { validateBodyWithH3V2 } from './rules/nuxt/server-routes/validate-body-with-h3-v2.js';
export { useAsyncDataKeyRequiredInLoop } from './rules/nuxt/data-fetching/useAsyncData-key-required-in-loop.js';
export { noExplicitImportsOfAutoImported } from './rules/nuxt/ai-slop/no-explicit-imports-of-auto-imported.js';
export { noFetchInSetup } from './rules/nuxt/ai-slop/no-fetch-in-setup.js';
export { noProcessClientServer } from './rules/nuxt/ai-slop/no-process-client-server.js';
export { noUseStateForServerData } from './rules/nuxt/ai-slop/no-useState-for-server-data.js';
export { definePropsTyped } from './rules/vue/composition/defineProps-typed.js';
export { preferScriptSetupForNewFiles } from './rules/vue/composition/prefer-script-setup-for-new-files.js';
export { preferDefineAsyncComponentOnRoute } from './rules/vue/performance/prefer-defineAsyncComponent-on-route.js';
export { preferReadonlyForInjected } from './rules/vue/reactivity/prefer-readonly-for-injected.js';
export { preferShallowRefForLargeData } from './rules/vue/reactivity/prefer-shallowRef-for-large-data.js';
export { watchWithoutCleanup } from './rules/vue/reactivity/watch-without-cleanup.js';
export { noDestructurePropsWithoutToRefs } from './rules/vue/ai-slop/no-destructure-props-without-toRefs.js';
export { noDestructureReactiveWithoutToRefs } from './rules/vue/ai-slop/no-destructure-reactive-without-toRefs.js';
export { noEmDashInString } from './rules/vue/ai-slop/no-em-dash-in-string.js';
export { noImportsFromVueWhenAutoImported } from './rules/vue/ai-slop/no-imports-from-vue-when-auto-imported.js';
export { noNonNullAssertionOnRefValue } from './rules/vue/ai-slop/no-non-null-assertion-on-ref-value.js';
