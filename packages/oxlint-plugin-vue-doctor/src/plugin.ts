import type { Plugin } from './rule-types.js';
import { noDestructurePropsWithoutToRefs } from './rules/ai-slop/no-destructure-props-without-toRefs.js';
import { noDestructureReactiveWithoutToRefs } from './rules/ai-slop/no-destructure-reactive-without-toRefs.js';
import { noEmDashInString } from './rules/ai-slop/no-em-dash-in-string.js';
import { noNonNullAssertionOnRefValue } from './rules/ai-slop/no-non-null-assertion-on-ref-value.js';

export const plugin: Plugin = {
  meta: { name: 'vue-doctor' },
  rules: {
    'no-em-dash-in-string': noEmDashInString,
    'no-destructure-props-without-to-refs': noDestructurePropsWithoutToRefs,
    'no-destructure-reactive-without-to-refs':
      noDestructureReactiveWithoutToRefs,
    'no-non-null-assertion-on-ref-value': noNonNullAssertionOnRefValue,
  },
};
