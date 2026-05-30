import { check as vForHasKey } from './v-for-has-key.js';
import { check as vIfVForPrecedence } from './v-if-v-for-precedence.js';
import { check as vMemoOnLargeList } from './v-memo-on-large-list.js';
import { check as noInlineObjectPropInList } from './no-inline-object-prop-in-list.js';
import type { TemplateRule } from './types.js';

export const TEMPLATE_RULES: TemplateRule[] = [
  { id: 'vue-doctor/template/v-for-has-key', check: vForHasKey },
  { id: 'vue-doctor/template/v-if-v-for-precedence', check: vIfVForPrecedence },
  { id: 'vue-doctor/template/v-memo-on-large-list', check: vMemoOnLargeList },
  {
    id: 'vue-doctor/template/no-inline-object-prop-in-list',
    check: noInlineObjectPropInList,
  },
];
