import type { Plugin } from './rule-types.js';
import { VUE_RULES } from '@geoql/doctor-rule-core';

export const plugin: Plugin = {
  meta: { name: 'vue-doctor' },
  rules: Object.fromEntries(VUE_RULES.map((rule) => [rule.id, rule])),
};
