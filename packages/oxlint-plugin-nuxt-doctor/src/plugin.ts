import type { Plugin } from './rule-types.js';
import { NUXT_RULES } from '@geoql/doctor-rule-core';

export const plugin: Plugin = {
  meta: { name: 'nuxt-doctor' },
  rules: Object.fromEntries(NUXT_RULES.map((rule) => [rule.id, rule])),
};
