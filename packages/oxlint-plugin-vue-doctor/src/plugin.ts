import type { Plugin } from './rule-types.js';
import { noEmDashInString } from './rules/ai-slop/no-em-dash-in-string.js';

export const plugin: Plugin = {
  meta: { name: 'vue-doctor' },
  rules: {
    'no-em-dash-in-string': noEmDashInString,
  },
};
