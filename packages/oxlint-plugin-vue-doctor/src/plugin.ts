import type { Plugin } from './rule-types.js';
import { noDestructurePropsWithoutToRefs } from './rules/ai-slop/no-destructure-props-without-toRefs.js';
import { noDestructureReactiveWithoutToRefs } from './rules/ai-slop/no-destructure-reactive-without-toRefs.js';
import { noEmDashInString } from './rules/ai-slop/no-em-dash-in-string.js';
import { noImportsFromVueWhenAutoImported } from './rules/ai-slop/no-imports-from-vue-when-auto-imported.js';
import { noNonNullAssertionOnRefValue } from './rules/ai-slop/no-non-null-assertion-on-ref-value.js';
import { preferReadonlyForInjected } from './rules/reactivity/prefer-readonly-for-injected.js';
import { preferShallowRefForLargeData } from './rules/reactivity/prefer-shallowRef-for-large-data.js';
import { watchWithoutCleanup } from './rules/reactivity/watch-without-cleanup.js';

export const plugin: Plugin = {
  meta: { name: 'vue-doctor' },
  rules: {
    'no-em-dash-in-string': noEmDashInString,
    'no-destructure-props-without-to-refs': noDestructurePropsWithoutToRefs,
    'no-destructure-reactive-without-to-refs':
      noDestructureReactiveWithoutToRefs,
    'no-non-null-assertion-on-ref-value': noNonNullAssertionOnRefValue,
    'no-imports-from-vue-when-auto-imported': noImportsFromVueWhenAutoImported,
    'reactivity/watch-without-cleanup': watchWithoutCleanup,
    'reactivity/prefer-shallowRef-for-large-data': preferShallowRefForLargeData,
    'reactivity/prefer-readonly-for-injected': preferReadonlyForInjected,
  },
};
