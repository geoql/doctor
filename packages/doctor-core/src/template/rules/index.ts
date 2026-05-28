import { check as vForHasKey } from './v-for-has-key.js';
import { check as vIfVForPrecedence } from './v-if-v-for-precedence.js';
import type { TemplateRule } from './types.js';

export const TEMPLATE_RULES: TemplateRule[] = [
  { id: 'vue-doctor/template/v-for-has-key', check: vForHasKey },
  { id: 'vue-doctor/template/v-if-v-for-precedence', check: vIfVForPrecedence },
];
