import { defineRule } from '../../define-rule.js';
import type { CoreRule } from '../../types.js';
import { noDestructurePropsWithoutToRefs } from './ai-slop/no-destructure-props-without-toRefs.js';
import { noDestructureReactiveWithoutToRefs } from './ai-slop/no-destructure-reactive-without-toRefs.js';
import { noEmDashInString } from './ai-slop/no-em-dash-in-string.js';
import { noImportsFromVueWhenAutoImported } from './ai-slop/no-imports-from-vue-when-auto-imported.js';
import { noNonNullAssertionOnRefValue } from './ai-slop/no-non-null-assertion-on-ref-value.js';
import { definePropsTyped } from './composition/defineProps-typed.js';
import { noPiniaStoreInSetup } from './composition/no-pinia-store-in-setup.js';
import { preferScriptSetupForNewFiles } from './composition/prefer-script-setup-for-new-files.js';
import { preferDefineAsyncComponentOnRoute } from './performance/prefer-defineAsyncComponent-on-route.js';
import { preferModuleScopePureFunction } from './performance/prefer-module-scope-pure-function.js';
import { preferModuleScopeStaticValue } from './performance/prefer-module-scope-static-value.js';
import { preferStableEmptyFallback } from './performance/prefer-stable-empty-fallback.js';
import { noFreshDepsInWatch } from './reactivity/no-fresh-deps-in-watch.js';
import { preferReadonlyForInjected } from './reactivity/prefer-readonly-for-injected.js';
import { preferShallowRefForLargeData } from './reactivity/prefer-shallowRef-for-large-data.js';
import { watchWithoutCleanup } from './reactivity/watch-without-cleanup.js';
import { noAuthTokenInWebStorage } from './security/no-auth-token-in-web-storage.js';
import { noEvalLike } from './security/no-eval-like.js';
import { noInnerHtml } from './security/no-inner-html.js';
import { noSecretsInSource } from './security/no-secrets-in-source.js';

function coreRule(
  id: string,
  category: CoreRule['category'],
  severity: CoreRule['severity'],
  recommended: boolean,
  rule: Omit<CoreRule, 'id' | 'category' | 'severity' | 'recommended'>,
): CoreRule {
  return { id, category, severity, recommended, ...rule };
}

export const VUE_RULES: readonly CoreRule[] = [
  coreRule(
    'no-em-dash-in-string',
    'ai-slop',
    'warn',
    true,
    defineRule(noEmDashInString),
  ),
  coreRule(
    'no-destructure-props-without-to-refs',
    'ai-slop',
    'error',
    true,
    defineRule(noDestructurePropsWithoutToRefs),
  ),
  coreRule(
    'no-destructure-reactive-without-to-refs',
    'ai-slop',
    'error',
    true,
    defineRule(noDestructureReactiveWithoutToRefs),
  ),
  coreRule(
    'no-non-null-assertion-on-ref-value',
    'ai-slop',
    'warn',
    true,
    defineRule(noNonNullAssertionOnRefValue),
  ),
  coreRule(
    'no-imports-from-vue-when-auto-imported',
    'ai-slop',
    'warn',
    true,
    defineRule(noImportsFromVueWhenAutoImported),
  ),
  coreRule(
    'reactivity/watch-without-cleanup',
    'reactivity',
    'warn',
    true,
    defineRule(watchWithoutCleanup),
  ),
  coreRule(
    'reactivity/prefer-shallowRef-for-large-data',
    'reactivity',
    'info',
    false,
    defineRule(preferShallowRefForLargeData),
  ),
  coreRule(
    'reactivity/prefer-readonly-for-injected',
    'reactivity',
    'info',
    false,
    defineRule(preferReadonlyForInjected),
  ),
  coreRule(
    'reactivity/no-fresh-deps-in-watch',
    'reactivity',
    'warn',
    true,
    defineRule(noFreshDepsInWatch),
  ),
  coreRule(
    'composition/prefer-script-setup-for-new-files',
    'composition',
    'warn',
    true,
    defineRule(preferScriptSetupForNewFiles),
  ),
  coreRule(
    'composition/defineProps-typed',
    'composition',
    'warn',
    true,
    defineRule(definePropsTyped),
  ),
  coreRule(
    'composition/no-pinia-store-in-setup',
    'composition',
    'warn',
    true,
    defineRule(noPiniaStoreInSetup),
  ),
  coreRule(
    'performance/prefer-defineAsyncComponent-on-route',
    'performance',
    'info',
    false,
    defineRule(preferDefineAsyncComponentOnRoute),
  ),
  coreRule(
    'performance/prefer-module-scope-static-value',
    'performance',
    'info',
    false,
    defineRule(preferModuleScopeStaticValue),
  ),
  coreRule(
    'performance/prefer-module-scope-pure-function',
    'performance',
    'info',
    false,
    defineRule(preferModuleScopePureFunction),
  ),
  coreRule(
    'performance/prefer-stable-empty-fallback',
    'performance',
    'warn',
    true,
    defineRule(preferStableEmptyFallback),
  ),
  coreRule(
    'security/no-inner-html',
    'security',
    'error',
    true,
    defineRule(noInnerHtml),
  ),
  coreRule(
    'security/no-eval-like',
    'security',
    'error',
    true,
    defineRule(noEvalLike),
  ),
  coreRule(
    'security/no-auth-token-in-web-storage',
    'security',
    'warn',
    true,
    defineRule(noAuthTokenInWebStorage),
  ),
  coreRule(
    'security/no-secrets-in-source',
    'security',
    'warn',
    true,
    defineRule(noSecretsInSource),
  ),
];
